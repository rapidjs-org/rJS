/* global config */

function getPluginName() {
	const namingParts = [
		config.frontendModuleFileName.prefix,
		config.frontendModuleFileName.suffix
	]
		.map(part => {
			return part.replace(/\./, "\\.");
		});

	const pluginName = (new Error).stack
		.split(/\n+/g)[2]
		.match(new RegExp(`${namingParts[0]}((@[a-z0-9_-]+\\/)?[a-z0-9_-]+)${namingParts[1]}`, "i"));

	if(!pluginName) {
		throw new ReferenceError("Could not retrieve plug-in name. Check naming correctness.");
	}

	return pluginName[1];
}

/**
 * Perform backend request.
 * @param {Object} body Body object to send along
 * @returns {Promise} Request promise eventualy resolving to response on success
 */
plugin.request = function(body) {
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