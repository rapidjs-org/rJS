/**
 * Perform a POST request.
 * @param {String} url Endpoint URL
 * @param {Object} body Body object to send along
 * @returns {Promise} Request promise eventualy resolving to response on success
 */
module.post = function(url, body) {
	return fetch(url, {
		method: "POST",
		mode: "same-origin",
		credentials: "same-origin",
		headers: {
			"Content-Type": "application/json"
		},
		redirect: "follow",
		referrerPolicy: "no-referrer",
		body: JSON.stringify(body)
	});
};