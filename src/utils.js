module.exports = {

	/**
     * Check whether the given value is of type string.
     * @param {*} value Value to check
     * @returns {Booelan} Whether the value is of type string
     */
	isString: value => {
		return typeof value === "string" || value instanceof String;
	},

	/**
     * Get the current timestamp in seconds representation.
     * @returns {Number} Timestamp floored to seconds
     */
	getTimestampInSecs: _ => {
		return Math.floor(Date.now() / 1000);
	}

};