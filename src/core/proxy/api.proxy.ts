/**
 * Reverse proxy server API module. Provides proxy maintenance
 * functionality with implicit process detach behavior.
 */


import _config from "../_config.json";


import { fork } from "child_process";
import { Dirent, readdirSync } from "fs";
import { join } from "path";

import { LogConsole } from "../../LogConsole";

import { captionEffectiveHostnames } from "../utils";
import { EmbedContext } from "../EmbedContext";

import { messageProxy } from "../utils";


function installLogConsole() {
    new LogConsole();
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
    installLogConsole();

    /*
     * Send embed message. Initial message failure to depict proxy
     * does not exist, i.e. a respective process must be started and
     * detached first. The embed call is repeated in that case.
     */
    const embedApp = async () => {
        const hostCaption: string = `${captionEffectiveHostnames()}:${EmbedContext.global.port}`;
        
        const embedSuccessful = await messageProxy(EmbedContext.global.port, "embed", EmbedContext.global.args);

        embedSuccessful
        ? console.log(`Embedded application cluster at ${hostCaption}`)
        : console.error(`Application cluster already running at ${hostCaption}`);

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
        const proxyProcess = fork(join(__dirname, "./server.http"), EmbedContext.global.args, {
            cwd: process.cwd(),
            detached: true
        });

        proxyProcess.on("message", async (message: string) => {
            if(message !== "listening") {
                console.error(`Error trying to start server proxy: ${message}`);
                
                return;
            }
            
            try {
                /*
                 * Definite embedding request to just started proxy process.
                 */
                await embedApp();
            } catch(err) {
                console.error(`Could not embed application to proxy: ${err.message}`);
        
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
    installLogConsole();
    
    // TODO: IDs?
    try {
        if(!await messageProxy(EmbedContext.global.port, "unbed", EmbedContext.global.hostnames)) {
            console.error(`Hostnames not registered at proxy ${captionEffectiveHostnames()}:${EmbedContext.global.port}`);

            return;
        }

        console.log(`Unbedded application cluster from ${captionEffectiveHostnames()}:${EmbedContext.global.port}`);
    } catch(err) {
        console.error(`No server proxy listening on :${EmbedContext.global.port}`);

        process.exit(1);
    }
}

/**
 * Stop all running proxy server application instances.
 * Implicitly conncects to the respective UNIX socket for
 * inter process communication.
 */
export function stop() {
    installLogConsole();
    
    forEachProxy(async (port: number) => {
        try {
            await messageProxy(port, "stop");
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
    installLogConsole();
    
    const proxyHosts: string[] = [];
    
    forEachProxy(async (port: number) => {
        const embeddedHostnames = await messageProxy(port, "monitor") as string[][];
        
        proxyHosts.push(`${port}: ${embeddedHostnames}`);   // TODO: "Beautify"
    })
    .then(() => console.log(`Proxies:\n${proxyHosts.join("\n")}`))
    .catch(() => {
        console.error("No proxies running");
        
        process.exit(1);
    });
}