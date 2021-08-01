const PERIOD_LENGTH = 60000;
const REQUEST_LIMIT = require("../support/is-dev-mode") ? null : require("../support/web-config").webConfig.maxRequestsPerMin;

const limiter = {
	previous: null,
	current: null
};
let windowStart;


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


module.exports = {
	/**
	 * Check whether to block the request by the rate limiter.
	 * @param {String} ip - IP address of request's remote connection
	 * @return {Boolean} - Whether the request must be blocked due to 429 (Too many requests)
	 */
	mustBlock: ip => {
		if(!REQUEST_LIMIT) {	// TODO: Check 0
			return false;
		}

		const curWindowWeight = updateWindow();
		const slideSum = Math.floor((curWindowWeight * (limiter.current[ip] || 0))
						+ ((1 - curWindowWeight) * (limiter.previous[ip] || 0)));
		if(slideSum >= REQUEST_LIMIT) {
			// Deny request
			return true;
		}

		limiter.current[ip] = isNaN(limiter.current[ip]) ? 0 : ++limiter.current[ip];
		
		// Allow request
		return false;
	}
};