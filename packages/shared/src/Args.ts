export class Args {
	private readonly raw: string[];

	public static cli: Args = new Args();

	constructor(raw: string[] = process.argv.slice(2)) {
		this.raw = raw;
	}

	/**
     * Retrieve the index of a key in the arguments array.
     * @param name Full key (without indicating double dashes)
     * @param shorthand Shorthand key (without indicating single dash)
     * @returns Value type resolve interface
     */
	private retrieveKeyIndex(name: string, shorthand?: string): number {
    	return Math.max(this.raw.indexOf(`--${name.toLowerCase()}`), shorthand ? this.raw.indexOf(`-${shorthand.toUpperCase()}`) : -1);
	}

	/**
     * Parse a specific positional argument from the given command
     * line arguments.
     * @param index Position key
     * @returns The name of the positional argument if provided at index (no indicating dash)
     */
	public parsePositional(index = 0): string {
		const positional: string = this.raw[index];

    	return !/^\-/.test(positional) ? positional : null;
	}

	/**
     * Parse a specific flag from the given command line arguments.
     * @param key Flag key (without indicating double dashes)
     * @param shorthand Flag shorthand (without indicating single dash)
     * @returns Whether the flag is set
     */
	public parseFlag(key: string, shorthand?: string): boolean {
    	return (this.retrieveKeyIndex(key, shorthand) >= 0);
	}

	/**
     * Parse a specific option from the given command line arguments.
     * @param key Option key (without indicating double dashes)
     * @param [shorthand] Option shorthand (without indicating single dash)
     * @returns Value type resolve interface
     */
	public parseOption(key: string, shorthand?: string): {
        string: string;
        number: number;
    } {
    	let index: number = this.retrieveKeyIndex(key, shorthand);
    	if(index < 0 || ++index >= this.raw.length) {
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
    		string: this.raw[index],
    		number: +this.raw[index]
    	};
	}
}