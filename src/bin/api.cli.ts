#!/usr/bin/env node

import devConfig from "../_config.json";


import { join } from "path";
import { Dirent, readFileSync, readdirSync } from "fs";
import { fork } from "child_process";

import { parseOption, parsePositional } from "../args";
import { proxyIPC } from "../proxy/proxy-ipc";
import { PORT } from "../PORT";
import { SHELL } from "../SHELL";
import { PATH } from "../PATH";
import { MODE } from "../MODE";
import * as print from "../proxy/print";


const command: string = parsePositional(0);
const hostname: string = parseOption("hostname", "H").string ?? "localhost";


switch(command) {

    case "help":
        console.log(
            String(readFileSync(join(__dirname, "./_help.txt")))
            .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
        );

        break;
    
    case "start":
        if(SHELL === undefined) {
            print.error("Missing shell application argument (position 1)");
            
            process.exit(1);
        }
        
        if(SHELL === null) {
            print.error("Referenced shell application could not be resolved");
            
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
    const hostname: string = parseOption("hostname", "H").string ?? "localhost";    // TODO: Intepret hostname protocol if provided
    const port: number = parseOption("port", "P").number ?? 80;    // TODO: HTTP or HTTPS (80, 443)

    const embed = async () => {
        try {
            await proxyIPC("embed", PORT, {
                mode: MODE,
                path: PATH,
                hostname
            });

            print.info(`Embedded application cluster at ${hostname}:${port}`);
        } catch(err) {
            print.error("Could not embed application to proxy:");
            print.error(err.message);
        }
    };

    // TODO: Check hostname syntax validity
    try {
        const occupantShellApp = await proxyIPC("shell_running") as string;

        if(occupantShellApp !== SHELL) {
            print.error(`Port is occupied by proxy running a different shell application '${
                occupantShellApp
                .match(/(\/)?(@?[a-z0-9_-]+\/)?[a-z0-9_-]+$/i)[0]
                .replace(/^\//, ".../")
            }'`);  // TODO: Response value

            return;
        }

        if(!await proxyIPC("hostname_available", PORT, hostname)) {
            print.info(`Hostname already in use on proxy ${hostname}:${port}`);

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
                print.error(`Error trying to start server proxy ':${PORT}': ${message}`);
                
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
        if(!await proxyIPC("unbed", PORT, hostname)) {
            print.error(`Hostname not registered on proxy ${hostname}:${PORT}`);

            return;
        }
        
        print.info(`Unbedded application cluster from ${hostname}:${PORT}`);
    } catch(err) {
        print.error(`No server proxy listening on :${PORT}`);
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
        const embeddedHostnames = await proxyIPC("retrieve_hostnames", port, hostname) as string[];

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