const limiter = {};
let windowStart;

const PERIOD_LENGTH = 60000;

function updateWindow() {
	const now = Date.now();
	
	let timeIn = Math.abs((windowStart || 0) - now);
	
	if(timeIn >= PERIOD_LENGTH) {
		limiter.previous = (timeIn >= (2 * PERIOD_LENGTH)) ? {} : (limiter.current || {});
		limiter.current = {};

		timeIn = timeIn % PERIOD_LENGTH;
		windowStart = now - timeIn;
	}

	return (timeIn / PERIOD_LENGTH);
}

/**
 * @param {Number} limit - Request limit (as set in configuration file)
 */
module.exports = limit => {
	return {
		/**
		 * Check whether to block the request by the rate limiter.
		 * @param {String} ip - IP address of request's remote connection
		 * @return {Boolean} - Whether the request must be blocked due to 429 (Too many requests)
		 */
		mustBlock: ip => {
			const curWindowWeight = updateWindow();
			const slideSum = Math.floor((curWindowWeight * (limiter.current[ip] || 0))
							+ ((1 - curWindowWeight) * (limiter.previous[ip] || 0)));
			if(slideSum >= limit) {
				// Deny request
				return true;
			}

			limiter.current[ip] = isNaN(limiter.current[ip]) ? 0 : ++limiter.current[ip];
			
			// Allow request
			return false;
		}
	};
};