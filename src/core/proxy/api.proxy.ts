/**
 * Reverse proxy server API module. Provides proxy maintenance
 * functionality with implicit process detach behavior.
 */


import _config from "../_config.json";


import { fork } from "child_process";
import { Dirent, readdirSync } from "fs";
import { join } from "path";

import { EmbedContext } from "../EmbedContext";
import { HTTPServer } from "../HTTPServer";
import { UnixServer } from "../UnixServer";


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
        const embedSuccessful = await UnixServer.message(EmbedContext.global.port, "embed", EmbedContext.global.args);
        
        embedSuccessful
        ? console.log(`Embedded proxied application cluster`)
        : console.error(`Application cluster already running at ${HTTPServer.captionEffectiveHostnames()}:${EmbedContext.global.port}`);
        
        process.exit(embedSuccessful ? 0 : 1);
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
        const proxyProcess = fork(join(__dirname, "./server"), EmbedContext.global.args, {
            cwd: process.cwd(),
            detached: true
        });

        proxyProcess.on("message", async (message: string) => {
            if(message !== "listening") {
                throw new SyntaxError(`Error trying to start server proxy:\n${message}`);    // TODO: Streamline log messages (resource files?)
            }
            
            try {
                /*
                 * Definite embedding request to just started proxy process.
                 */
                await embedApp();
            } catch(err) {
                throw new Error(`Could not embed application to proxy:\n${err.message}`);
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
        if(!await UnixServer.message(EmbedContext.global.port, "unbed", EmbedContext.global.hostnames)) {
            throw new ReferenceError(`Hostnames not registered at proxy ${HTTPServer.captionEffectiveHostnames()}:${EmbedContext.global.port}`);
        }   // TODO: Remove hostname caption here?

        console.log(`Unbedded application cluster from ${HTTPServer.captionEffectiveHostnames()}:${EmbedContext.global.port}`);
    } catch(err) {
        throw new ReferenceError(`No server proxy listening on :${EmbedContext.global.port}`);
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
            await UnixServer.message(port, "stop");
        } catch {}
    })
    .then(() => console.log("Stopped all proxies"));
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
        const embeddedHostnames = await UnixServer.message(port, "monitor") as string[][];
        
        proxyHosts.push(`${port}: ${embeddedHostnames}`);   // TODO: "Beautify"
    })
    .then(() => console.log(`Proxies:\n${proxyHosts.join("\n")}`))
    .catch(() => {
        throw new RangeError("No proxies running");
    });
}