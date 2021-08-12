const {join, extname} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("../utils");

const output = require("../support/output");
const webPath = require("../support/web-path");


const explicitHandlers = {
	read: new Map(),
	write: new Map()
};

let curContext;


const reader = {

	explicit: (extension, callback) => {
		extension = utils.normalizeExtension(extension);

		explicitHandlers.read.has(extension) && output.log(`Redundant set up of explicit reader for extension'${extension}'`);

		explicitHandlers.read.set(extension, callback);
	},

	apply: (pathname, reducedRequestObject) => {
		const extension = utils.normalizeExtension(extname(pathname));
		const localPath = join(webPath, pathname);

		let data;

		if(explicitHandlers.read.has(extension)) {
			data = explicitHandlers.read.get(extension)(localPath, reducedRequestObject);
		} else {
			if(!existsSync(localPath)) {
				throw new ReferenceError(`Could not read web file from '${pathname}'`);
			}
			
			data = readFileSync(localPath);
		}

		data = writer.apply(extension, data, reducedRequestObject);

		return data;
	},

	try: pathname => {
		const localPath = join(webPath, pathname);
	
		return existsSync(localPath);
	}

};

const writer = {

	explicit: (extension, callback) => {
		extension = utils.normalizeExtension(extension);

		explicitHandlers.write.set(extension, callback);
	},

	apply: (extension, data, reducedRequestObject) => {
		if(!explicitHandlers.write.has(extension)) {
			return data;
		}
	
		return explicitHandlers.write.get(extension)(String(data), reducedRequestObject);
	}

};

const context =  {

	set: context => {
		curContext = context;
	},

	get: _ => {
		return curContext || {};
	}

};


module.exports = {
	setContext: context.set,
	reader,
	writer,

	interface: {
		read: pathname => {
			return reader.apply(pathname, context.get());
		},

		exists: reader.try
	}
};