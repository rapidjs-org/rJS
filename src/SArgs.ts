/**
 * Class representing a static CLI argument parser.
 */
export class SArgs {

    private static array: string[] = process.argv.slice(2);

    /**
     * Retrieve the index of a key in the arguments array.
     * @param name Full key (without indicating double dashes)
     * @param shorthand Shorthand key (without indicating single dash)
     * @returns Value type resolve interface
     */
    private static retrieveKeyIndex(name: string, shorthand?: string): number {
        return Math.max(SArgs.array.indexOf(`--${name}`), shorthand ? SArgs.array.indexOf(`-${shorthand}`) : -1);
    }

    /**
     * Parse a specific positional argument from the given command
     * line arguments.
     * @param index Position key
     * @returns The name of the positional argument if provided at index (no indicating dash)
     */
    public static parsePositional(index: number = 0): string {
        return /^[^-]/.test(SArgs.array[index] ?? "")
        ? SArgs.array[index]
        : undefined;
    }

    /**
     * Parse a specific flag from the given command line arguments.
     * @param key Flag key (without indicating double dashes)
     * @param shorthand Flag shorthand (without indicating single dash)
     * @returns Whether the flag is set
     */
    public static parseFlag(key: string, shorthand?: string): boolean {
        return (SArgs.retrieveKeyIndex(key, shorthand) >= 0);
    }

    /**
     * Parse a specific option from the given command line arguments.
     * @param key Option key (without indicating double dashes)
     * @param [shorthand] Option shorthand (without indicating single dash)
     * @returns Value type resolve interface
     */
    public static parseOption(key: string, shorthand?: string): {
        string: string;
        number: number;
    } {
        let index: number = SArgs.retrieveKeyIndex(key, shorthand);
        if(index < 0 || ++index >= SArgs.array.length) {
            return {
                string: undefined,
                number: undefined
            };
        }

        /*
        * Create an object from a value with type specific properties.
        * Utilize after parsing an option in order to fit type.
        */
        return {
            string: SArgs.array[index],
            number: +SArgs.array[index]
        };
    }

}