/**
 * Class representing a CLI argument parser.
 */
export class Args {

    public static readonly global = new Args(process.argv.slice(2));
    
    private positionals: string[] = [];
    private designated: string[] = [];

    constructor(array: string[]) {
    	for(let i = 0; i < array.length; i++) {
    		if(/^-/.test(array[i])) {
    			this.designated = array.slice(i);

    			break;
    		}
            
    		this.positionals.push(array[i]);
    	}
    }

    /**
     * Retrieve the index of a key in the arguments array.
     * @param name Full key (without indicating double dashes)
     * @param shorthand Shorthand key (without indicating single dash)
     * @returns Value type resolve interface
     */
    private retrieveKeyIndex(name: string, shorthand?: string): number {
    	return Math.max(this.designated.indexOf(`--${name}`), shorthand ? this.designated.indexOf(`-${shorthand}`) : -1);
    }

    /**
     * Parse a specific positional argument from the given command
     * line arguments.
     * @param index Position key
     * @returns The name of the positional argument if provided at index (no indicating dash)
     */
    public parsePositional(index = 0): string {
    	return this.positionals[index];
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
    	if(index < 0 || ++index >= this.designated.length) {
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
    		string: this.designated[index],
    		number: +this.designated[index]
    	};
    }

}