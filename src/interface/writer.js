const utils = require("../utils");

const explicitWriters = new Map();

function set(extension, callback) {
	extension = utils.normalizeExtension(extension);

	explicitWriters.set(extension, callback);
}

function apply(extension, data) {
	if(!explicitWriters.has(extension)) {
		return data;
	}

	return explicitWriters.get(extension)(data);
}

module.exports = {
	set,
	apply
};