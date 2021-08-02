const {join} = require("path");
const {existsSync, readFileSync} = require("fs");

const webPath = require("../support/web-path");

function read(pathname) {
	/* if(read.caller.name != "processFile") {
		console.log(read.caller)
	} */
	const localPath = join(webPath, pathname);
	
	if(!existsSync(localPath)) {
		throw new ReferenceError(`Web file supposed to be read could not be located '${pathname}'`);
	}

	let contents = readFileSync(localPath);

	// TODO: Apply templating to any HTML file?
	// TODO: How to access reduced request object from anywhere?
	/* if(/^.*\.html$/.test(pathname)) {
		// Template includes if is web page
		data = templating.renderIncludes(String(data), reducedRequestObject);

		if(!/.*(^|\/):[a-z0-9_-]\/*.*$/i.test(pathname)) {
			// No compound directory involved
			return contents;
		}

		// Template dynamics if is compound page or descendant support markup file (requires templating module)
		try {
			data = templating.renderDynamics(data, reducedRequestObject);
		} catch(err) {
			output.log(`An error occurred templating dynamics into '${pathname}'`);
			output.error(err, true);
		}
	}; */

	return contents;
}

module.exports = read;