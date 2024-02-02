export class Args {
	private static readonly raw: string[] = process.argv.slice(2);

	/**
     * Retrieve the index of a key in the arguments array.
     * @param name Full key (without indicating double dashes)
     * @param shorthand Shorthand key (without indicating single dash)
     * @returns Value type resolve interface
     */
	private static retrieveKeyIndex(name: string, shorthand?: string): number {
    	return Math.max(Args.raw.indexOf(`--${name.toLowerCase()}`), shorthand ? Args.raw.indexOf(`-${shorthand.toUpperCase()}`) : -1);
	}

	/**
     * Parse a specific positional argument from the given command
     * line arguments.
     * @param index Position key
     * @returns The name of the positional argument if provided at index (no indicating dash)
     */
	public static parsePositional(index = 0): string {
		const positional: string = Args.raw[index];

    	return !/^\-/.test(positional) ? positional : null;
	}

	/**
     * Parse a specific flag from the given command line arguments.
     * @param key Flag key (without indicating double dashes)
     * @param shorthand Flag shorthand (without indicating single dash)
     * @returns Whether the flag is set
     */
	public static parseFlag(key: string, shorthand?: string): boolean {
    	return (this.retrieveKeyIndex(key, shorthand) >= 0);
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
    	let index: number = this.retrieveKeyIndex(key, shorthand);
    	if(index < 0 || ++index >= Args.raw.length) {
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
    		string: Args.raw[index],
    		number: +Args.raw[index]
    	};
	}
}