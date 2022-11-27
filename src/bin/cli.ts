import { join } from "path";
import { readFileSync } from "fs";

import { parseFlag } from "../args";


if(parseFlag("help", "H")) {    // TODO: Global bin?
    process.stdout.write(
        String(readFileSync(join(__dirname, "./help.txt")))
        .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
        + "\n"
    );
    
    process.exit(0);

    // TODO: Make extensible
}