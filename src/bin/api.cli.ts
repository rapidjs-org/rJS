#!/usr/bin/env node

import devConfig from "../_config.json";


import { Dirent, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fork } from "child_process";

import { sendIPC } from "../ipc-locate";
import * as print from "../print";

import { parsePositional } from "./args";
import * as embed from "./embed";


const command: string = parsePositional(0);
switch(command) {

    case "help":
        console.log(
            String(readFileSync(join(__dirname, "./_help.txt")))
            .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
        );

        break;
    
    case "start":
        if(!embed.SHELL) {
            print.error((embed.SHELL === undefined)
            ? "Missing shell application argument (position 1)"
            : "Referenced shell application could not be resolved");
            
            process.exit(1);
        }
        
        start();

        break;
        
    case "stop":
        stop();
        // TODO: Socket communication fail kill fallback? Double-check?

        break;
    
    case "stopall":
        stopall();

        break;
        
    case "monitor":
        monitor();

        break;
        
    default:
        print.info(
            command
            ? `Unknown command '${command}'`
            : "No command provided"
        );

        process.exit(1);

}


async function start() {
    const embedApp = async () => {
        try {
            await sendIPC("embed", embed.PORT, embed);
            
            print.info(`Embedded application cluster at ${embed.HOSTNAME}:${embed.PORT}`);
        } catch(err) {
            print.error("Could not embed application to proxy:");
            print.error(err.message);
        }
    };

    // TODO: Check hostname syntax validity
    try {
        const occupantShellApp = await sendIPC("shell_running") as string;

        if(occupantShellApp !== embed.SHELL) {
            print.error(`Port is occupied by proxy running a different shell application '${
                occupantShellApp
                .match(/(\/)?(@?[a-z0-9_-]+\/)?[a-z0-9_-]+$/i)[0]
                .replace(/^\//, ".../")
            }'`);  // TODO: Response value

            return;
        }

        if(!await sendIPC("hostname_available", embed.PORT, embed.HOSTNAME)) {
            print.info(`Hostname already in use on proxy ${embed.HOSTNAME}:${embed.PORT}`);

            return;
        }

        embedApp();
    } catch {
        const proxyProcess = fork(join(__dirname, "../proxy/process"), process.argv.slice(2), {
            cwd: process.cwd(),
            detached: true
        });

        proxyProcess.on("message", async (message: string) => {
            if(message !== "listening") {
                print.error(`Error trying to start server proxy ':${embed.PORT}': ${message}`);
                
                return;
            }

            // TODO: handle errors, print.error(err.message);
            
            await embedApp();

            process.exit(0);
        }); // TODO: DEV MODE live app log / manipulation inerface

        proxyProcess.send(JSON.stringify(embed));
    }
}

async function stop() {
    // TODO: IDs?
    try {
        if(!await sendIPC("unbed", embed.PORT, embed.HOSTNAME)) {
            print.error(`Hostname not registered on proxy ${embed.HOSTNAME}:${embed.PORT}`);

            return;
        }
        
        print.info(`Unbedded application cluster from ${embed.HOSTNAME}:${embed.PORT}`);
    } catch(err) {
        print.error(`No server proxy listening on :${embed.PORT}`);
    }
}

async function stopall() {
    forEachProxy(async (port: number) => {
        try {
            await sendIPC("stop", port);
        } catch {}
    })
    .then(() => print.info("Stopped all proxies"));
}   // TODO: Port-wise?

function monitor() {
    const proxyHosts: string[] = [];
    
    forEachProxy(async (port: number) => {
        const embeddedHostnames = await sendIPC("retrieve_hostnames", port, embed.HOSTNAME) as string[];

        proxyHosts.push(`${port}: ${embeddedHostnames.join(", ")}`);
    })
    .then(() => print.info(`Proxies:\n${proxyHosts.join("\n")}`))
    .catch(() => print.error("No proxies running"));
}


function forEachProxy(callback: ((port: number) => Promise<void>|void)): Promise<void> {
    let i = 1;

    return new Promise(async (resolve, reject) => {
        const socketDirents : Dirent[] = readdirSync(devConfig.socketDir, {
            withFileTypes: true
        })
        .filter((dirent: Dirent) => dirent.isFile)
        .filter((dirent: Dirent) => {
            return new RegExp(
                `${devConfig.socketNamePrefix}[0-9]+.sock`
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