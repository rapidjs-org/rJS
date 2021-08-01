const {join} = require("path");
const {existsSync, readFileSync} = require("fs");

const webPath = require("../support/web-path");


module.exports = pathname => {
	// TODO: Read from compound directory if exists?

	const localPath = join(webPath, pathname);
	
	if(!existsSync(localPath)) {
		throw new ReferenceError(`Web file supposed to be read could not be located '${pathname}'`);
	}

	return readFileSync(localPath);
};