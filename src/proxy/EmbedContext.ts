import { join, isAbsolute, normalize } from "path";

import { parsePositional, parseFlag, parseOption } from "../args";


/**
 * Class representing data associated with a concrete server
 * application embed context. Provides static access to the
 * global context as read from the given CLI arguments.
 * Specific contexts can be constructed when needed.
 */
export class EmbedContext {

    /*
     * Always provide embed context based on process argv.
     * Considered global embed context as is sufficient for most
     * memory spaces.
     */
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
        /*
         * Arguments provided for context resembling process argv
         * without the leading exec and file path information.
         */
        this.args = args;
        
        /*
         * Which server shell interpreting the concrete application
         * is requested to be embedded.
         */
        // TODO: Provide positional-only aliases for known |start| <shell> combinations
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

        /*
         * Which hostname(s) to associate with the application and
         * therefore reverse-proxy accordingly.
         */
        this.hostnames = (parseOption("hostname", "H").string ?? "localhost")
        .split(/,/g);
        // TODO: Check hostnames syntax validity

        /*
         * Whether to require HTTPS to be used (instead of bare HTTP).
         */
        this.isSecure = parseFlag("secure", "S") || /^https:\/\//i.test(this.hostnames[0]);
        
        /*
         * Which port to embed application to. Embeds to the related
         * proxy process if already exists, or spins up a process
         * first otherwise.
         */
        this.port = parseOption("port", "P").number ?? (this.isSecure ? 443 : 80);
        
        /*
         * Working directory of the embedded application. Uses the
         * commanding CWD by default.
         */
        const wdPath: string = process.cwd();
        const argPath: string = parseOption("wd", "W").string;
        
        this.path = normalize(
            argPath
            ? (!isAbsolute(argPath)
                ? join(process.cwd(), argPath)
                : argPath)
            : wdPath
        );
        
        /*
         * Encode the runtime mode representing a dictionary with
         * all existing modes mapped to their respective activation
         * state boolean. Enables multiple concurrent modes and a
         * simple access usage.
         */
        const devFlagSet: boolean = parseFlag("dev", "D");
        
        this.mode = {
            DEV: devFlagSet,
            PROD: !devFlagSet
        };
    }

}