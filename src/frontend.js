/* global config */

function getPluginName() {
	const pluginName = (new Error).stack
		.split(/\n+/g)[2]
		.match(new RegExp(`${config.pluginRequestPrefix}((@[a-z0-9_-]+\\/)?[a-z0-9_-]+)`, "i"));
	if(!pluginName) {
		throw new ReferenceError("Could not retrieve plug-in name. Check naming correctness.");
	}

	return pluginName[1];
}

/**
 * Perform request ro plug-in related endpoint (id set up).
 * @param {Object} body Body object to send along being passed to the endpoint callback
 * @returns {Promise} Request promise eventualy resolving to response on success
 */
PUBLIC.useEndpoint = function(body) {
	const pathname = `/${getPluginName()}`;

	return fetch(pathname, {
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

// TODO: Method to load closest error?