"use strict";
/**
 * Command line argument parser.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.argument = void 0;
// Input sequence (by words)
const input = (process.argv.length > 2)
    ? process.argv.slice(2)
    : [];
/**
 * Parse given CLI arguments against a name for value retrieval
 * (or evaluation).
 * Arguments to be induced by name prefixed with a double dash
 * or shorthand with a single dash (e.g. --dev, -D).
 * @param {string} name Argument name (processed all lowercase)
 * @param {string} [shorthand] Argument shorthand (processed all uppercase)
 */
function parse(name, shorthand) {
    name = name.toLowerCase();
    // Retrieve index in input array
    const index = Math.max(input.indexOf(`--${name}`), shorthand
        ? input.indexOf(`-${shorthand.toUpperCase()}`)
        : -1);
    if (index == -1) {
        // Abort if argument not passed (no record entry)
        return;
    }
    // Read optionally given value (next word in input sequence)
    // Check if consequitve word exists and is not an argument itself
    const consequtiveWord = input[index + 1];
    const value = /^[^-]/.test(consequtiveWord || "")
        ? consequtiveWord
        : true; // Simply mark as given (unary, exists)
    args[name] = value;
}
// Parse arguments record
const args = {};
// Parse arguments
parse("dev", "D"); // Whether is in DEV MODE (unary)
parse("path", "P"); // Explicit project path (instead of using referencing module location)
/**
 * Obtain CLI argument value (string).
 * false if not given, true if given without a consequtive value.
 * @param {string} name Argument name
 * @returns {string|boolean} Argument value (or boolean state if none given)
 */
function argument(name) {
    return args[name] || false;
}
exports.argument = argument;
;