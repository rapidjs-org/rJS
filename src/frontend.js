/* global config */

const retrieveEndpoint = _ => {	// TODO: FIND MORE RELIABLE APPROACH
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
};

/**
 * Perform request ro plug-in related endpoint (id set up).
 * @param {Object} [body] Body object to send along being passed to the endpoint callback
 * @param {Function} [progressHandler] Callback repeatedly getting passed the current loading progress [0, 1]
 * @returns {Promise} Request promise eventualy resolving to response message
 */
PUBLIC.useEndpoint = function(body, progressHandler) {
	const pathname = `/${retrieveEndpoint()}`;
	
	return new Promise((resolve, reject) => {
		fetch(pathname, {
			method: "POST",
			mode: "same-origin",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json"
			},
			redirect: "follow",
			referrerPolicy: "no-referrer",
			body: JSON.stringify({
				meta: {
					pathname: document.location.pathname
				},
				body: body
			})
		}).then(async res => {
			// Explicitly download body to handle progress
			const contentLength = res.headers.get("Content-Length");
			let receivedLength = 0;

			const reader = res.body.getReader();
			let chunks = [];
			let curChunk;
			while((curChunk = await reader.read()) && !curChunk.done) {
				applyProgressHandler(receivedLength / contentLength);

				receivedLength += curChunk.value.length;
				chunks.push(curChunk.value);
			}
			applyProgressHandler(1);
			
			let chunksAll = new Uint8Array(receivedLength);
			let position = 0;
			for(let chunk of chunks) {
				chunksAll.set(chunk, position);
				position += chunk.length;
			}

			const message = JSON.parse(new TextDecoder("utf-8").decode(chunksAll));
			
			resolve(message);
		}).catch(_ => {
			reject();
		});
	});

	function applyProgressHandler(progress) {
		progressHandler && progressHandler(progress);
	}
};

// TODO: Method to load closest error?