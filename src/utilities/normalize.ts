/**
 * Normalization helper functions.
 */


/**
 * Normalize file extension.
 * Remove possibly given leading dot and convert to all lowercase representation.
 * @param {string} extension Raw extension sequence
 * @returns {string} Normalized extension
 */
export function normalizeExtension(extension: string): string {
	return extension
		.trim()
		.replace(/^\./, "")
		.toLowerCase();
}

/**
 * Remove module related extension for given path or file name.
 * .{js, ts, javascript, typescript}
 * @param {string} name Name to truncate
 * @returns {string} Truncated name
 */
export function truncateModuleExtension(name: string): string {
	return name.replace(/\.(j(ava)?|t(ype)?)s(cript)?$/i, "");
}