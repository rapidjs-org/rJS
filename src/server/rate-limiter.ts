/**
 * Rate limiting to be utilized upon each request.
 */


import serverConfig from "../config/config.server";


// Parameter
const periodLength = 60000;

// Object
const limiter = {
	windowStart: 0,
	previous: null,
	current: null
};


/**
 * Update limiter window.
 * @returns {number} Current window weight
 */
function updateWindow() {
	const now = Date.now();
	
	let timeIn = Math.abs(limiter.windowStart - now);
	
	if(timeIn >= periodLength) {
		limiter.previous = (timeIn >= (2 * periodLength)) ? {} : (limiter.current || {});
		limiter.current = {};

		timeIn = timeIn % periodLength;
		limiter.windowStart = now - timeIn;
	}

	return (timeIn / periodLength);
}


/**
 * Check whether to block the request by the rate limiter.
 * @param {string} ip - IP address of request's remote connection
 * @return {boolean} - Whether the request must be blocked due to 429 (Too many requests)
 */
export function rateExceeded(ip: string) {
	if(!serverConfig.limit.requestsPerMin) {
		return false;
	}

	const curWindowWeight = updateWindow();
	const slideSum = Math.floor((curWindowWeight * (limiter.current[ip] || 0))
					+ ((1 - curWindowWeight) * (limiter.previous[ip] || 0)));
	if(slideSum >= serverConfig.limit.requestsPerMin) {
		// Deny request
		return true;
	}

	limiter.current[ip] = isNaN(limiter.current[ip])
		? 0
		: ++limiter.current[ip];
	
	// Allow request
	return false;
}