#!/usr/bin/env node

import devConfig from "../_config.json";


import { Dirent, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fork } from "child_process";

import { proxyIPC } from "../proxy-ipc";
import * as print from "../proxy/print";

import * as runtime from "./runtime";




switch(runtime.COMMAND) {

    case "help":
        console.log(
            String(readFileSync(join(__dirname, "./_help.txt")))
            .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
        );

        break;
    
    case "start":
        if(!runtime.SHELL) {
            print.error((runtime.SHELL === undefined)
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
            runtime.COMMAND
            ? `Unknown command '${runtime.COMMAND}'`
            : "No command provided"
        );

        process.exit(1);

}


async function start() {
    const embed = async () => {
        try {
            await proxyIPC("embed", runtime.PORT, {
                mode: runtime.MODE,
                path: runtime.PATH,
                hostname: runtime.HOSTNAME
            });

            print.info(`Embedded application cluster at ${runtime.HOSTNAME}:${runtime.PORT}`);
        } catch(err) {
            print.error("Could not embed application to proxy:");
            print.error(err.message);
        }
    };

    // TODO: Check hostname syntax validity
    try {
        const occupantShellApp = await proxyIPC("shell_running") as string;

        if(occupantShellApp !== runtime.SHELL) {
            print.error(`Port is occupied by proxy running a different shell application '${
                occupantShellApp
                .match(/(\/)?(@?[a-z0-9_-]+\/)?[a-z0-9_-]+$/i)[0]
                .replace(/^\//, ".../")
            }'`);  // TODO: Response value

            return;
        }

        if(!await proxyIPC("hostname_available", runtime.PORT, runtime.HOSTNAME)) {
            print.info(`Hostname already in use on proxy ${runtime.HOSTNAME}:${runtime.PORT}`);

            return;
        }

        embed();
    } catch {
        const proxyProcess = fork(join(__dirname, "../proxy/process"), process.argv.slice(2), {
            cwd: process.cwd(),
            detached: true
        });

        proxyProcess.on("message", async (message: string) => {
            if(message !== "listening") {
                print.error(`Error trying to start server proxy ':${runtime.PORT}': ${message}`);
                
                return;
            }

            // TODO: handle errors, print.error(err.message);
            
            await embed();

            process.exit(0);
        }); // TODO: DEV MODE live app log / manipulation inerface

        proxyProcess.send("start");
    }
}

async function stop() {
    // TODO: IDs?
    try {
        if(!await proxyIPC("unbed", runtime.PORT, runtime.HOSTNAME)) {
            print.error(`Hostname not registered on proxy ${runtime.HOSTNAME}:${runtime.PORT}`);

            return;
        }
        
        print.info(`Unbedded application cluster from ${runtime.HOSTNAME}:${runtime.PORT}`);
    } catch(err) {
        print.error(`No server proxy listening on :${runtime.PORT}`);
    }
}

async function stopall() {
    forEachProxy(async (port: number) => {
        try {
            await proxyIPC("stop", port);
        } catch {}
    })
    .then(() => print.info("Stopped all proxies"));
}   // TODO: Port-wise?

function monitor() {
    const proxyHosts: string[] = [];
    
    forEachProxy(async (port: number) => {
        const embeddedHostnames = await proxyIPC("retrieve_hostnames", port, runtime.HOSTNAME) as string[];

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