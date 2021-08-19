const {join, extname} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("../utils");

const webPath = require("../support/web-path");
const locale = require("../support/locale");

const ClientError = require("../interface/ClientError");
const modifier = require("../interface/modifier");


function read(pathname, reducedRequestObject) {
	const localPath = join(webPath, pathname);
	if(!existsSync(localPath)) {
		throw new ClientError(404);
	}
	
	let data = readFileSync(localPath);
	
	const extension = utils.normalizeExtension(extname(pathname));
	if(extension == "html") {
		// modifier
		data = locale.translate(String(data), reducedRequestObject);
	}

	return data;
}

function exists(pathname) {
	const localPath = join(webPath, pathname);

	return existsSync(localPath);
}


module.exports = {
	read,

	interface: {
		read: read,
		exists: exists
	}
};