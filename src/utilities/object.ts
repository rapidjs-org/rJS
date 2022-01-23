/**
 * Object helper functions.
 */


/**
 * Merge two objects with right associative override (recursive).
 * @param {Record} obj1 Object 1
 * @param {Record} obj2 Object 2 (overriding)
 * @returns {Record} Merged object.
 */
export function merge(obj1: Record<string, unknown>, obj2: Record<string, unknown>): Record<string, unknown> {
	// Explicitly merge sub objects
	for(const key of (Object.keys(obj1).concat(Object.keys(obj2)))) {
		if((obj1[key] || "").constructor.name !== "Object"
        || (obj2[key] || "").constructor.name !== "Object") {
			// Leaf
			obj1[key] = obj2[key] || obj1[key];

			continue;
		}
		
		// Recursive
		obj2[key] = merge(
			obj1[key] as Record<string, unknown>,
			obj2[key] as Record<string, unknown>
		);
	}

	return {...obj1, ...obj2}; // Merge top level
}