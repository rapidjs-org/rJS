import { isAbsolute, join } from "path";
import { fork } from "child_process";
import { homedir } from "os";

import { IApiEmbed } from "shared/interface";


export async function embed(workingDir: string = process.cwd()): Promise<IApiEmbed> {
	const specifiedWorkingDir: string = isAbsolute(workingDir)
		? workingDir
		: join(process.cwd(), workingDir);
	try {
		process.chdir(specifiedWorkingDir);
	} catch {
		throw new ReferenceError(`Specified application working directory does not exist at path '${specifiedWorkingDir}'`);
	}
    
	const { Context } = await import("@rapidjs.org/shared");

	const port: number = Args.cli.parseOption("port", "P").number ?? Context.CONFIG.get<number>("port");
	if(isNaN(port)) {
		throw new TypeError("Given port is not a number");
	}
    
	if(Context.MODE === "DEV") {
		(await import("../../proxy/src/app"))
		.init({
			port: port,
			clustered: false
		}, false);
        
		return {
			port,

			hostnames: "localhost"
		};
	}

	const protocol: TProtocol = (Args.cli.parseFlag("secure", "S") ?? Context.CONFIG.get<boolean>("secure")) ? "HTTPS" : "HTTP";
	const hostnames: string[] = (Args.cli.parseOption("hostname", "H").string ?? "").length
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
		.then((/* proxyPID: number */) => resolve({
			port, hostnames
		}))
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
            
			detachedChild.once("message", (/* proxyPID: number */) => resolve({
				port, hostnames
			}));
            
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

export async function unbed(ports: number|number[] = IPCServer.associatedPorts(), hostnames: string|string[] = []): Promise<void> {
	const proxiedPorts: number[] = [ ports ].flat();

	if(!proxiedPorts.length) {
		throw new RangeError("No host registered at the moment");
	}

	for(let port of proxiedPorts) {
		IPCServer.message(port, "unbed", [ hostnames ].flat().filter((hostname: string) => hostname))
		.catch((err: Error & { code: string; }) => {
			if(err.code === "ENOENT") {
				throw new ReferenceError(`No proxy process associated with port ${port}`);
			}
			throw err;
		});
	}
}


type TDisplayProxyMonitor = (IProxyMonitor & { port: number; });

export async function monitor(): Promise<TDisplayProxyMonitor[]> {
	const proxiedPorts: number[] = IPCServer.associatedPorts();

	if(!proxiedPorts.length) {
		throw new RangeError("No host registered at the moment");
	}

	const displayProxyMonitors: TDisplayProxyMonitor[] = [];
	for(let i = 0; i < proxiedPorts.length; i++) {
		try {
			displayProxyMonitors.push({
				port: proxiedPorts[i],

				...(await IPCServer.message(proxiedPorts[i], "ping")) as IProxyMonitor
			});
		} catch(err: unknown) {
			console.error(err.toString());

			// TODO: Spot erroneous proxy (?)
		}	
	}

	return displayProxyMonitors;
}