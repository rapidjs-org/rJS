export const __esModule: boolean;
/**
 * Class representing a CLI argument parser.
 */
export class Args {
    constructor(array: any);
    positionals: any[];
    designated: any;
    /**
     * Retrieve the index of a key in the arguments array.
     * @param name Full key (without indicating double dashes)
     * @param shorthand Shorthand key (without indicating single dash)
     * @returns Value type resolve interface
     */
    retrieveKeyIndex(name: any, shorthand: any): number;
    /**
     * Parse a specific positional argument from the given command
     * line arguments.
     * @param index Position key
     * @returns The name of the positional argument if provided at index (no indicating dash)
     */
    parsePositional(index?: number): any;
    /**
     * Parse a specific flag from the given command line arguments.
     * @param key Flag key (without indicating double dashes)
     * @param shorthand Flag shorthand (without indicating single dash)
     * @returns Whether the flag is set
     */
    parseFlag(key: any, shorthand: any): boolean;
    /**
     * Parse a specific option from the given command line arguments.
     * @param key Option key (without indicating double dashes)
     * @param [shorthand] Option shorthand (without indicating single dash)
     * @returns Value type resolve interface
     */
    parseOption(key: any, shorthand?: any): {
        string: any;
        number: number;
    };
}
export namespace Args {
    const global: Args;
}
