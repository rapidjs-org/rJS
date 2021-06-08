function makeRequest(method, url, body = undefined) {
	return fetch(url, {
		method: method,
		mode: "same-origin",
		credentials: "same-origin",
		headers: {
			"Content-Type": "application/json"
		},
		redirect: "follow",
		referrerPolicy: "no-referrer",
		body: body ? JSON.stringify(body) : body
	});
}

/**
 * Perform a GET request.
 * @param {String} url Endpoint URL
 * @returns {Promise} Request promise eventualy resolving to response on success
 */
 plugin.post = function(url) {
	return makeRequest("GET", url);
};

/**
 * Perform a POST request.
 * @param {String} url Endpoint URL
 * @param {Object} body Body object to send along
 * @returns {Promise} Request promise eventualy resolving to response on success
 */
plugin.post = function(url, body) {
	return makeRequest("POST", url, body);
};