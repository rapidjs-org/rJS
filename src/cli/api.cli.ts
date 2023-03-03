#!/usr/bin/env node


import { readFileSync } from "fs";
import { join } from "path";

import { parsePositional } from "../args";
import * as print from "../print";
import * as proxy from "../proxy/api.proxy";


/*
 * Interpret first positional argument as execution command.
 * Command to depict which functional aspect to perform.
 */
const command: string = parsePositional(0);
switch(command) {

    /*
     * Display help text.
     */
    case "help":
        console.log(
            String(readFileSync(join(__dirname, "./_help.txt")))
            .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
        );

        break;
    
    /*
     * Start concrete server application instance embedded in
     * underlying proxy application.
     */
    case "start":
        proxy.embed();
        
        break;
    
    /*
     * Stop concrete server application instance by unbedding it
     * from the underlying proxy application.
     */
    case "stop":
        proxy.unbed();

        break;
    
    /*
     * Stop all running proxy applications and any concrete server
     * application inherently.
     */
    case "stopall":
        proxy.stop();

        break;
    
    /*
     * Monitor relevant information about all running proxy applications
     * and any concrete server application inherently.
     */
    case "monitor":
        proxy.monitor();

        break;
    
    // Handle undefined command
    default:
        print.info(
            command
            ? `Unknown command '${command}'`
            : "No command provided"
        );

        process.exit(1);

}