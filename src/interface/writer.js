const utils = require("../utils");

const explicitWriters = new Map();

function set(extension, callback) {
	extension = utils.normalizeExtension(extension);

	explicitWriters.set(extension, callback);
}

function apply(extension, data, reducedRequestObject) {
	if(!explicitWriters.has(extension)) {
		return data;
	}

	return explicitWriters.get(extension)(String(data), reducedRequestObject);
}

module.exports = {
	set,
	apply
};