import { join, isAbsolute, normalize } from "path";

import { parsePositional, parseFlag, parseOption } from "../args";


export class EmbedContext {

    static global = new EmbedContext(process.argv.slice(2));

    public readonly args: string[];
    public readonly shellReference: string;
    public readonly hostnames: string[];
    public readonly isSecure: boolean;
    public readonly port: number;
    public readonly path: string;
    public readonly mode: {
        DEV: boolean;
        PROD: boolean;
    };

    constructor(args: string[]) {
        this.args = args;

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
        
        this.shellReference = shellReference;

        this.hostnames = (parseOption("hostname", "H").string ?? "localhost")
        .split(/,/g);
        // TODO: Check hostnames syntax validity

        this.isSecure = parseFlag("secure", "S") || /^https:\/\//i.test(this.hostnames[0]);
        
        this.port = parseOption("port", "P").number ?? (this.isSecure ? 443 : 80);

        const wdPath: string = process.cwd();
        const argPath: string = parseOption("wd", "W").string;
        
        this.path = normalize(
            argPath
            ? (!isAbsolute(argPath)
                ? join(process.cwd(), argPath)
                : argPath)
            : wdPath
        );
        
        
        const devFlagSet: boolean = parseFlag("dev", "D");
        
        this.mode = {
            DEV: devFlagSet,
            PROD: !devFlagSet
        };
    }

}