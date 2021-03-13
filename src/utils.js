module.exports = {

	/**
     * Check whether the given value is of type string.
     * @param {*} value Value to check
     * @returns {Booelan} Whether the value is of type string
     */
	isString: value => {
		return typeof value === "string" || value instanceof String;
	}

};