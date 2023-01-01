#!/usr/bin/env node


const devConfig = {
    ...require("../dev-config.json")
}


import { join } from "path";
import { readFileSync } from "fs";
import { Socket, createServer as createUnixSocketServer } from "net";

import { parseFlag } from "../args";

import { embedSpace } from "./server";


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


/* process.on("") */


/* const socketPort: number = 4000;

createUnixSocketServer((connection: Socket) => {
    console.log(connection);

    // TODO: CPP register free here (for all child processes)

    const spaceEnv: ISpaceEnv = {
        PATH: process.cwd(),
        MODE: "{ DEV: true, PROD: false }"
    };   // TODO: Receive spaceEnv (WD/PATH, MODE)

    embedSpace(spaceEnv);
})
.listen(`${devConfig.socketsDirPath}${devConfig.socketFilePrefix}${socketPort}`, () => {
    process.send("socket-listening");
});   // TODO: Infere port form boot data */


embedSpace();