/* global config */

function getPluginUrl() {	// TODO: FIND MORE RELIABLE APPROACH AND IMPLEMENTATION!
	const pluginName = (new Error).stack
		.split(/\n+/g)
		.filter(call => {
			return call.includes("http");
		})[2]
		.match(new RegExp(`${config.pluginRequestPrefix}((@[a-z0-9_-]+\\/)?[a-z0-9_-]+)`, "i"));
	
	if(!pluginName) {
		throw new ReferenceError("Could not retrieve name of active plug-in. Revise naming rules.");
	}

	return pluginName[1];
}

/**
 * Perform request ro plug-in related endpoint (id set up).
 * @param {Object} body Body object to send along being passed to the endpoint callback
 * @returns {Promise} Request promise eventualy resolving to response on success
 */
PUBLIC.useEndpoint = function(body) {
	const pathname = `/${getPluginUrl()}`;
	
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