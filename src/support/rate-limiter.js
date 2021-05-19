var limiter = {};

// Limiter interval
setInterval(_ => {
	limiter = {};
}, 60000);

/**
 * Check whether to block the request by the rate limiter.
 * @param {String} ip - IP address of request's remote connection
 * @param {Number} limit - Request limit as set in config
 * @return {Boolean} - Whether the request must be blocked due to 429 (Too many requests)
 */
function mustBlock(ip, limit) {
	// Skip rate limiting if no limit defined or set to 0 (infinite requests allowed) in config
	if(limit === 0) {
		return false;
	}
    
	ip = String(ip);
	if(!limiter[ip]) {
		limiter[ip] = 1;
	} else {
		limiter[ip]++;
        
		// Block request if is over limit
		if(limiter[ip] > limit) {
			return true;
		}
	}

	// Allow request
	return false;
}

module.exports = {
	mustBlock
};