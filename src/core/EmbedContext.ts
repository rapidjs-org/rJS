import { join, isAbsolute, normalize } from "path";

import { SArgs } from "../SArgs";


/**
 * Class representing data associated with a concrete server
 * application embed context. Provides static access to the
 * global context as read from the given CLI arguments.
 * Specific contexts can be constructed when needed.
 */
export class EmbedContext { // TODO: Singleton

    /*
     * Always provide embed context based on process argv.
     * Considered global embed context as is sufficient for most
     * memory spaces.
     */
    public static readonly global = new EmbedContext(process.argv.slice(2));

    public readonly args: string[];
    public readonly concreteAppModulePath: string;
    public readonly hostnames: string[];
    public readonly isSecure: boolean;
    public readonly port: number;
    public readonly path: string;
    public readonly mode: {
        DEV: boolean;
        PROD: boolean;
    };

    constructor(relatedSArgs: string[]) {
        /*
         * Arguments provided for context resembling process argv
         * without the leading exec and file path information.
         */
        this.args = relatedSArgs;

        /*
         * Which concrete server application the core is supposed
         * to interpret within the related cluster threads.
         */
        // TODO: Provide positional-only aliases for known |start| <concrete> combinations
        let concreteReference: string = SArgs.parsePositional(1);
        if(concreteReference) {
            concreteReference = (!/^(@?[a-z0-9_-]+\/)?[a-z0-9_-]+/i.test(concreteReference) && !isAbsolute(concreteReference))
            ? join(process.cwd(), concreteReference)
            : concreteReference;
            
            try {
                concreteReference = require.resolve(concreteReference);
            } catch {
                concreteReference = null;
            }
        }
        
        this.concreteAppModulePath = concreteReference;

        /*
         * Which hostname(s) to associate with the application and
         * therefore reverse-proxy accordingly.
         */
        this.hostnames = (SArgs.parseOption("hostname", "H").string ?? "localhost")
        .split(/,/g);
        // TODO: Check hostnames syntax validity

        /*
         * Whether to require HTTPS to be used (instead of bare HTTP).
         */
        this.isSecure = SArgs.parseFlag("secure", "S") || /^https:\/\//i.test(this.hostnames[0]);
        
        /*
         * Which port to embed application to. Embeds to the related
         * proxy process if already exists, or spins up a process
         * first otherwise.
         */
        this.port = SArgs.parseOption("port", "P").number ?? (this.isSecure ? 443 : 80);
        
        /*
         * Working directory of the embedded application. Uses the
         * commanding CWD by default.
         */
        const wdPath: string = process.cwd();
        const argPath: string = SArgs.parseOption("wd", "W").string;
        
        this.path = normalize(
            argPath
            ? (!isAbsolute(argPath)
                ? join(wdPath, argPath)
                : argPath)
            : wdPath
        );
        
        /*
         * Encode the runtime mode representing a dictionary with
         * all existing modes mapped to their respective activation
         * state boolean. Enables multiple concurrent modes and a
         * simple access usage.
         */
        const devFlagSet: boolean = SArgs.parseFlag("dev", "D");
        
        this.mode = {
            DEV: devFlagSet,
            PROD: !devFlagSet
        };
    }

}