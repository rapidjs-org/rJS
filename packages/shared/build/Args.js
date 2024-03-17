export class Args {
    constructor(raw = process.argv.slice(2)) {
        this.raw = raw;
    }
    /**
     * Retrieve the index of a key in the arguments array.
     * @param name Full key (without indicating double dashes)
     * @param shorthand Shorthand key (without indicating single dash)
     * @returns Value type resolve interface
     */
    retrieveKeyIndex(name, shorthand) {
        return Math.max(this.raw.indexOf(`--${name.toLowerCase()}`), shorthand ? this.raw.indexOf(`-${shorthand.toUpperCase()}`) : -1);
    }
    /**
     * Parse a specific positional argument from the given command
     * line arguments.
     * @param index Position key
     * @returns The name of the positional argument if provided at index (no indicating dash)
     */
    parsePositional(index = 0) {
        const positional = this.raw[index];
        return !/^\-/.test(positional) ? positional : null;
    }
    /**
     * Parse a specific flag from the given command line arguments.
     * @param key Flag key (without indicating double dashes)
     * @param shorthand Flag shorthand (without indicating single dash)
     * @returns Whether the flag is set
     */
    parseFlag(key, shorthand) {
        return (this.retrieveKeyIndex(key, shorthand) >= 0);
    }
    /**
     * Parse a specific option from the given command line arguments.
     * @param key Option key (without indicating double dashes)
     * @param [shorthand] Option shorthand (without indicating single dash)
     * @returns Value type resolve interface
     */
    parseOption(key, shorthand) {
        let index = this.retrieveKeyIndex(key, shorthand);
        if (index < 0 || ++index >= this.raw.length) {
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
Args.cli = new Args();
