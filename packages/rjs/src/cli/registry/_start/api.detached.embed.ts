import { join, resolve as resolvePath } from "path";
import { existsSync } from "fs";
import { homedir } from "os";

import { Args } from "../../Args";
import { CONTEXT } from "../local.constants";

import * as rJSProxyAPI from "@rapidjs.org/rjs-proxy";


const workingDirPath: string = resolvePath(Args.parseOption("working-dir", "W").string());
if(!existsSync(workingDirPath)) {
    throw new ReferenceError(`Target working directory does not exist at ${workingDirPath}`);
}
process.chdir(homedir());


rJSProxyAPI.embed(CONTEXT.port, {
    devMode: CONTEXT.devMode,
    hostnames: CONTEXT.hostnames,
    tls: {
        cert: join(workingDirPath, "./cert.pem"),   // TODO: How to define?
        key: join(workingDirPath, "./key.pem"),     // TODO: How to define?
    },  // TODO
    workingDirPath: workingDirPath
})
.then(() => process.send(""))
.catch((err: Error) => console.error(err));