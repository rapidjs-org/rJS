import { join } from "path";
import { readFileSync } from "fs";

import { parseFlag } from "../args";
import * as print from "../print";

import { MODE } from "./MODE";


if(parseFlag("help", "H")) {
    process.stdout.write(
        String(readFileSync(join(__dirname, "./help.txt")))
        .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
        + "\n"
    );
    
    process.exit(0);

    // TODO: Make extensible?
}


// TODO: Check if related poroxy is already running then use embed
// Otherwise boot (with related port) and then embed




print.info(`Started server cluster running \x1b[1m${MODE.DEV ? "\x1b[38;2;224;0;0mDEV" : "PROD"} ENV.MODE\x1b[0m`);