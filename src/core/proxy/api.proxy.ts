/**
 * Reverse proxy server API module. Provides proxy maintenance
 * functionality with implicit process detach behavior.
 */


import _config from "../_config.json";


import { fork } from "child_process";
import { Dirent, readdirSync } from "fs";
import { Socket, createConnection as createUnixSocketConnection } from "net";
import { join } from "path";

import { IProxyIPCPackage } from "../../_interfaces";
import * as print from "../../print";

import { captionEffectiveHostnames } from "../utils";
import { EmbedContext } from "../EmbedContext";

import { locateProxySocket } from "./utils";


/**
 * Message the context related proxy application by sending it
 * to the respective UNIX socket. The socket location is inherent
 * to the current runtime context as provided by the present
 * argument set.
 * @param port Portmto which the addressed proxy is bound
 * @param command Command to expect the proxy application to execute
 * @param arg Argument supplementory to command
 * @returns Promise resolving to the buffered proxy response message
 */
function messageProxy(port: number, command: string, arg?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const client: Socket = createUnixSocketConnection(locateProxySocket(port));
        
        const proxyIPCPackage: IProxyIPCPackage = {
            command, arg
        };
        
        client.write(JSON.stringify(proxyIPCPackage));
        
        client.on("data", (message: Buffer) => {
            resolve(JSON.parse(message.toString()));
            
            client.end();
        });

        client.on("error", (error: Buffer) => {
            // console.error(error.toString());
            
            reject(new Error(error.toString()));
            
            client.end();
        });
    });
}

/**
 * Invoke callback for each running proxy instance passing the
 * associated port.
 * @param callback Callback getting passed the port of the currently handled proxy instance
 * @returns Promise resolving once each proxy has been handled
 */
function forEachProxy(callback: ((port: number) => Promise<void>|void)): Promise<void> {
    let i = 1;

    return new Promise(async (resolve, reject) => {
        const socketDirents : Dirent[] = readdirSync(_config.socketDir, {
            withFileTypes: true
        })
        .filter((dirent: Dirent) => dirent.isFile)
        .filter((dirent: Dirent) => {
            return new RegExp(
                `${_config.socketNamePrefix}[0-9]+.sock`
                .replace(/\./g, "\\.")
            ).test(dirent.name);
        });

        if(!socketDirents.length) {
            reject();

            return;
        }

        await socketDirents
        .forEach(async (dirent: Dirent) => {
            const port: number = parseInt(dirent.name.match(/[0-9]+/)[0]);

            const result = callback(port);
            (!(result instanceof Promise)
            ? new Promise(resolve => resolve(result))
            : result)
            .then(() => {
                (i === socketDirents.length)
                && resolve();
            })
            .finally(() => i++);
        });
    });
}


/**
 * Embed a concrete server application to the related proxy
 * application. Implicitly connects to the respective UNIX
 * socket for inter process communication.
 */
export async function embed() {
    /*
     * Send embed message. Initial message failure to depict proxy
     * does not exist, i.e. a respective process must be started and
     * detached first. The embed call is repeated in that case.
     */
    const embedApp = async () => {
        const hostCaption: string = `${captionEffectiveHostnames()}:${EmbedContext.global.port}`;
        
        await messageProxy(EmbedContext.global.port, "embed", EmbedContext.global.args)
        ? print.info(`Embedded application cluster at ${hostCaption}`)
        : print.info(`Application cluster already running at ${hostCaption}`);

        process.exit(0);
    };

    try {
        /*
         * Initial embed request assuming proxy process does already exist.
         */
        await embedApp();
    } catch {
        /*
         * Start proxy process as initial embedding has failed and proxy
         * process is thus assumed to be missing.
         */
        const proxyProcess = fork(join(__dirname, "./server.http"), EmbedContext.global.args, {
            cwd: process.cwd(),
            detached: true
        });

        proxyProcess.on("message", async (message: string) => {
            if(message !== "listening") {
                print.error(`Error trying to start server proxy: ${message}`);
                
                return;
            }

            try {
                /*
                 * Definite embedding request to just started proxy process.
                 */
                await embedApp();
            } catch(err) {
                print.error(`Could not embed application to proxy: err.message`);
                
                process.exit(1);
            }
        }); // TODO: DEV MODE live app log / manipulation inerface
    }
}

/**
 * Unbed a concrete server application from the related proxy
 * application. Implicitly connects to the respective UNIX
 * socket for inter process communication.
 */
export async function unbed() {
    // TODO: IDs?
    try {
        if(!await messageProxy(EmbedContext.global.port, "unbed", EmbedContext.global.hostnames)) {
            print.error(`Hostnames not registered at proxy ${captionEffectiveHostnames()}:${EmbedContext.global.port}`);

            return;
        }

        print.info(`Unbedded application cluster from ${captionEffectiveHostnames()}:${EmbedContext.global.port}`);
    } catch(err) {
        print.error(`No server proxy listening on :${EmbedContext.global.port}`);
    }
}

/**
 * Stop all running proxy server application instances.
 * Implicitly conncects to the respective UNIX socket for
 * inter process communication.
 */
export function stop() {
    forEachProxy(async (port: number) => {
        try {
            await messageProxy(port, "stop");
        } catch {}
    })
    .then(() => print.info("Stopped all proxies"));
}

/**
 * Montior all running proxy server application instances
 * by printing relevant information comprising proxy as well
 * as bound application parameters. Implicitly conncects to
 * the respective UNIX socket for inter process communication.
 */
export function monitor() {
    const proxyHosts: string[] = [];
    
    forEachProxy(async (port: number) => {
        const embeddedHostnames = await messageProxy(port, "monitor") as string[][];
        
        proxyHosts.push(`${port}: ${embeddedHostnames}`);   // TODO: "Beautify"
    })
    .then(() => print.info(`Proxies:\n${proxyHosts.join("\n")}`))
    .catch(() => print.error("No proxies running"));
}