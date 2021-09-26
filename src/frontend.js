/* global config */

const performRequest = (method, pathname, body) => {
	return fetch(pathname, {
		method: method,
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

// Public exports
return {

	/**
	 * Perform request ro plug-in related endpoint (id set up).
	 * @param {String} pluginName Internal name of plug-in to be addressed
	 * @param {Object} [body] Body object to send along being passed to the endpoint callback
	 * @param {Function} [progressHandler] Callback repeatedly getting passed the current loading progress [0, 1]
	 * @returns {Promise} Request promise eventualy resolving to response message
	 */
	endpoint: (pluginName, body, progressHandler) => {
		const pathname = `/${pluginName}`;
		
		return new Promise((resolve, reject) => {
			performRequest("POST", pathname, {
				meta: {
					pathname: document.location.pathname
				},
				body: body
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

				((res.status % 200) < 99) ? resolve(message) : reject(message);
			}).catch(_ => {
				reject(new Error("Could not connect to endpoint"));
			});
		});

		function applyProgressHandler(progress) {
			progressHandler && progressHandler(progress);
		}
	},

	/**
	 * Redirect to the next related error page.
	 * @param {Number} status Status code
	 */
	redirectError: status => {
		console.log(status);
		// TODO: Implement (on hold)
	}

};