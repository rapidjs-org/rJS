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
import * as standalone from "../core/standalone/api.standalone";
import * as proxy from "../core/proxy/api.proxy";

import { CLI } from "./CLI";


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
    Args.global.parseFlag("standalone")
    ? standalone.serveStandalone()
    : proxy.embed();
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