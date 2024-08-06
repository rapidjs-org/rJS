import { join, resolve as resolvePath } from "path";
import { existsSync } from "fs";
import { homedir } from "os";

import { Args } from "../../Args";
import { ARG_CONTEXT } from "../ARG_CONTEXT";

import * as rJSProxyAPI from "@rapidjs.org/rjs-proxy";


const workingDirPath: string = resolvePath(process.cwd(), Args.parseOption("working-dir", "W").string());
if(!existsSync(workingDirPath)) {
    throw new ReferenceError(`Target working directory does not exist at ${workingDirPath}`);
}
process.chdir(homedir());


rJSProxyAPI.embed(ARG_CONTEXT.port, {
    hostnames: ARG_CONTEXT.hostnames,
    tls: {
        cert: join(workingDirPath, "./cert.pem"),   // TODO: How to define?
        key: join(workingDirPath, "./key.pem"),     // TODO: How to define?
    },  // TODO
    workingDirPath: workingDirPath
})
.then(() => process.send(""))
.catch((err: Error) => console.error(err));