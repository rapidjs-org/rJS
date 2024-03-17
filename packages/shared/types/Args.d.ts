export declare class Args {
    private readonly raw;
    static cli: Args;
    constructor(raw?: string[]);
    /**
     * Retrieve the index of a key in the arguments array.
     * @param name Full key (without indicating double dashes)
     * @param shorthand Shorthand key (without indicating single dash)
     * @returns Value type resolve interface
     */
    private retrieveKeyIndex;
    /**
     * Parse a specific positional argument from the given command
     * line arguments.
     * @param index Position key
     * @returns The name of the positional argument if provided at index (no indicating dash)
     */
    parsePositional(index?: number): string;
    /**
     * Parse a specific flag from the given command line arguments.
     * @param key Flag key (without indicating double dashes)
     * @param shorthand Flag shorthand (without indicating single dash)
     * @returns Whether the flag is set
     */
    parseFlag(key: string, shorthand?: string): boolean;
    /**
     * Parse a specific option from the given command line arguments.
     * @param key Option key (without indicating double dashes)
     * @param [shorthand] Option shorthand (without indicating single dash)
     * @returns Value type resolve interface
     */
    parseOption(key: string, shorthand?: string): {
        string: string;
        number: number;
    };
}
//# sourceMappingURL=Args.d.ts.map