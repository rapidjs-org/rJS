import { isAbsolute, join } from "path";

import { parsePositional } from "./args";


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