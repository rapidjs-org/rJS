#!/usr/bin/env node


import { join } from "path";
import { readFileSync } from "fs";

import { parsePositional } from "../args";

import { embedSpace } from "./server";
import * as print from "./print";


const providedCommand: string = parsePositional();

switch(providedCommand) {

    case "help":
        console.log(
            String(readFileSync(join(__dirname, "./help.txt")))
            .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
        );

        process.exit(0);
    
    case "start":
        embedSpace();

        process.exit(0);
    
    case "stop":
        // ...
        process.exit(0);
    
    case "monitor":
        // ...
        process.exit(0);
    
    default:
        print.info(
            providedCommand
            ? `Unknown command '${providedCommand}'`
            : "No command provided"
        );
        
        process.exit(0);
    
}