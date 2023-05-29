export const __esModule: boolean;
/**
 * Class representing data associated with a concrete server
 * application embed context. Provides static access to the
 * global context as read from the given CLI arguments.
 * Specific contexts can be constructed when needed.
 */
export class EmbedContext {
    constructor(relatedArgs: any);
    args: any;
    argsParser: Args_1.Args;
    concreteAppModulePath: any;
    hostnames: any;
    isSecure: boolean;
    port: number;
    path: string;
    mode: {
        DEV: boolean;
        PROD: boolean;
    };
}
export namespace EmbedContext {
    const global: EmbedContext;
}
import Args_1 = require("../Args");
