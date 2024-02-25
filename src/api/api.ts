import { isAbsolute, join } from "path";
import { fork } from "child_process";
import { homedir } from "os";

import { Args } from "../common/Args";
import { TProtocol } from "../types";
import { IPCServer } from "../common/IPCServer";
import { IContextEmbed } from "../interfaces";


export async function embed(workingDir: string = process.cwd()): Promise<number> {
    const specifiedWorkingDir: string = isAbsolute(workingDir)
                                      ? workingDir
                                      : join(process.cwd(), workingDir)
	try {
		process.chdir(specifiedWorkingDir);
	} catch {
		throw new ReferenceError(`Specified application working directory does not exist at path '${specifiedWorkingDir}'`);
	}
    
	const { Context } = await import("../common/Context");

    const port: number = Args.cli.parseOption("port", "P").number ?? Context.CONFIG.get<number>("port");
    if(isNaN(port)) {
        throw new TypeError(`Given port is not a number '${port}'`);
    }
    
    if((Context).MODE === "DEV") {
        return (await import("../proxy/api.proxy"))
        .init({
            port: port,
            clustered: false
        }, false);
    }

    const protocol: TProtocol = (Args.cli.parseFlag("secure", "S") ?? Context.CONFIG.get<boolean>("secure")) ? "HTTPS" : "HTTP";
    const hostnames: string[] = Args.cli.parseOption("hostname", "H").string.length
    ? (Args.cli.parseOption("hostname", "H").string ?? "").split(",")
    : [ (Context.CONFIG.get<string|string[]>("hostname") ?? "localhost") ].flat();

    // TODO: Hostname syntax validator?

    const contextEmbed: IContextEmbed = {
        cwd: process.cwd(),
        args: process.argv.slice(2),
        protocol: protocol,
        hostnames: hostnames,
        port: port,
        clustered: true
    };

    return new Promise(async (resolve, reject) => {
        IPCServer.message(port, "embed", contextEmbed)
        .then((/* proxyPID: number */) => resolve(port))
        .catch((err: Error & { code: string; }) => {
            if(err.code === "ECONNREFUSED") {
                IPCServer.clean(port);
            } else if(err.code !== "ENOENT") {
                throw err;
            }

            const detachedChild = fork(join(__dirname, "../proxy/api.proxy"), {
                cwd: homedir(),
                detached: false,
                silent: true
            });
            process.on("SIGINT", () => detachedChild.kill());
            
            detachedChild.once("message", (/* proxyPID: number */) => resolve(port));
            
            detachedChild.stdout.on("data", (data: Buffer) => {
                console.log(data.toString());
            });
            detachedChild.stderr.on("data", (data: Buffer) => {
                reject(data.toString());
    
                detachedChild.kill();
            });
    
            detachedChild.send(contextEmbed);
        });
    });
}

export function unbed(port: number = 80, hostnames: string|string[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
        IPCServer.message(port, "unbed", [ hostnames ].flat().filter((hostname: string) => hostname))
        .then(() => resolve())
        .catch((err: Error & { code: string; }) => {
            (err.code === "ENOENT")
            ? reject(new ReferenceError(`No proxy process associated with port ${port}`))
            : reject(err);
        });
    });
}