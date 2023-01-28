import { join, isAbsolute, normalize } from "path";

import { parsePositional, parseFlag, parseOption } from "./args";


export const COMMAND: string = parsePositional(0);


let shellReference: string = parsePositional(1);

if(shellReference) {
    shellReference = (!/^(@?[a-z0-9_-]+\/)?[a-z0-9_-]+/i.test(shellReference) && !isAbsolute(shellReference))
    ? join(process.cwd(), shellReference)
    : shellReference;
    
    try {
        shellReference = require.resolve(shellReference);
    } catch {
        shellReference = null;
    }
}


export const SHELL: string = shellReference;

// TODO: Retrieve full path to module


export const HOSTNAME: string = parseOption("hostname", "H").string ?? "localhost"; // TODO: Interpret protocol


export const PORT = parseOption("port", "P").number ?? 80;    // TODO: HTTP or HTTPS (80, 443)


const wdPath: string = process.cwd();
const argPath: string = parseOption("wd", "W").string;

export const PATH: string = normalize(
    argPath
    ? (!isAbsolute(argPath)
        ? join(process.cwd(), argPath)
        : argPath)
    : wdPath
);


const devFlagSet: boolean = parseFlag("dev", "D");

export const MODE = {
    DEV: devFlagSet,
    PROD: !devFlagSet
};