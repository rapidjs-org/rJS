#!/usr/bin/env node


/**
 * Command line interface entry module interpreting the
 * induced command in order to perform a respective
 * application routine. Each routine is disjunctive to
 * the other routines, i.e. does not invoke others as a
 * sub-/follow-up routine.
 */


import { readFileSync } from "fs";
import { join } from "path";

import { Args } from "../Args";
import { EmbedContext } from "../core/EmbedContext";
import * as standalone from "../core/standalone/api.standalone";
import * as proxy from "../core/proxy/api.proxy";

import { CLI } from "./CLI";
import { LogConsole } from "./LogConsole";


new LogConsole();


/*
 * Display help text.
 */
CLI.registerCommand("help", () => {
    console.log(
        String(readFileSync(join(__dirname, "./_help.txt")))
        .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
    );
});

/*
 * Start concrete server application instance embedded in
 * underlying proxy application.
 */
CLI.registerCommand("start", () => {
    const modeLogCallback = () => {
        const modeDict = EmbedContext.global.mode as Record<string, boolean>;
        
        let runningMode: string;
        for(let mode in modeDict) {
            runningMode = mode;
            if(modeDict[mode]) break;
        }
        
        console.log(`Running \x1b[1m${EmbedContext.global.mode.DEV ? "\x1b[31m" : ""}${runningMode} MODE\x1b[0m${EmbedContext.global.isSecure ? ` (secure)` : ""}`);
    };

    Args.global.parseFlag("standalone")
    ? standalone.serveStandalone(modeLogCallback)
    : proxy.embed(modeLogCallback);
});

/*
 * Stop concrete server application instance by unbedding it
 * from the underlying proxy application.
 */
CLI.registerCommand("stop", () => {
    proxy.unbed();
});

/*
 * Stop all running proxy applications and any concrete server
 * application inherently.
 */
CLI.registerCommand("stopall", () => {
    proxy.stop();
});

/*
 * Monitor relevant information about all running proxy applications
 * and any concrete server application inherently.
 */
CLI.registerCommand("monitor", () => {
    proxy.monitor();
});


CLI.eval();