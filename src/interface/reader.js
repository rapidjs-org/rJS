const {join, extname} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("../utils");

const output = require("../support/output");
const webPath = require("../support/web-path");

const explicitReaders = new Map();

function set(extension, callback) {
	extension = utils.normalizeExtension(extension);

	explicitReaders.has(extension) && output.log(`Redundant set up of explicit reader for extension'${extension}'`);

	explicitReaders.set(extension, callback);
}

function apply(pathname) {
	const extension = utils.normalizeExtension(extname(pathname));
	const localPath = join(webPath, pathname);
	
	if(explicitReaders.has(extension)) {
		return explicitReaders.get(extension)(localPath);
	}
	
	if(!existsSync(localPath)) {
		throw new ReferenceError(`Could not read web file from '${pathname}'`);
	}

	return readFileSync(localPath);
}

function exists(pathname) {
	const localPath = join(webPath, pathname);

	return existsSync(localPath);
}

module.exports = {
	set,
	apply,
	
	interface: {
		read: apply,
		exists
	}
};