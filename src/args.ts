/**
 * Command line argument parser.
 */


// Input sequence (by words)
const input: string[] = (process.argv.length > 2)
	? process.argv.slice(2)
	: [];

// Parse arguments record
const args: Record<string, string|boolean> = {};


/**
 * Parse given CLI arguments against a name for value retrieval
 * (or evaluation).
 * Arguments to be induced by name prefixed with a double dash
 * or shorthand with a single dash (e.g. --dev, -D).
 * @param {string} name Argument name (processed all lowercase)
 * @param {string} [shorthand] Argument shorthand (processed all uppercase)
 */
function parse(name: string, shorthand?: string) {
	name = name.toLowerCase();

	// Retrieve index in input array
	const index: number = Math.max(input.indexOf(`--${name}`), shorthand
		? input.indexOf(`-${shorthand.toUpperCase()}`)
		: -1);

	if(index == -1) {
		// Abort if argument not passed (no record entry)
		return;
	}

	// Read optionally given value (next word in input sequence)
	// Check if consequitve word exists and is not an argument itself
	const consequtiveWord: string = input[index + 1];
	const value: string|boolean = /^[^-]/.test(consequtiveWord || "")
		? consequtiveWord
		: true; // Simply mark as given (unary, exists)

	args[name] = value;
}

/**
 * Obtain CLI argument value (string).
 * false if not given, true if given without a consequtive value.
 * @param {string} name Argument name
 * @returns {string|boolean} Argument value (or boolean state if none given)
 */
export function argument(name: string): string|boolean {
	return args[name] || false;
}


// Parse arguments
parse("dev", "D");      // Whether is in DEV MODE (unary)
parse("path", "P");     // Explicit project path (instead of using referencing module location)