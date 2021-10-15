const {join, extname, basename} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("../utils");

const webPath = require("../support/web-path");
const locale = require("../support/locale");

const ClientError = require("../interface/ClientError");
const templater = require("../interface/templater");

const entityHook = require("../server/entity-hook");
const output = require("../support/output");


function read(pathname) {
	const localPath = join(webPath, pathname);
	if(!existsSync(localPath)) {
		throw new ClientError(404);
	}
	
	let data = readFileSync(localPath);
	
	if(utils.normalizeExtension(extname(pathname)) != "html") {
		return data;
	}

	const reducedRequestObject = entityHook.reducedRequestObject();

	// Markup modifications
	data = locale.translate(String(data), reducedRequestObject);
	
	const localHandlerPath = reducedRequestObject.isCompound
	? join(webPath, reducedRequestObject.pathname, `_${basename(reducedRequestObject.compound.base).replace(/\.[a-z0-9]+$/i, "")}.js`)
	: null;
	
	let localHandlerObj;
	
	try {
		localHandlerObj = (localHandlerPath && existsSync(localHandlerPath)) ? require(localHandlerPath) : {};
		localHandlerObj = utils.isFunction(localHandlerObj) ? localHandlerObj(reducedRequestObject) : localHandlerObj
	} catch(err) {
		output.log(`An error occured evaluating the tempating handler object at '${localHandlerPath}':`);
		output.error(err);
	}
	
	try {
		data = templater.apply(data, localHandlerObj, reducedRequestObject);
	} catch(err) {
		!(err instanceof ClientError) && output.log(`An error occured applying the tempating handler to '${reducedRequestObject.pathname}':`);
		output.error(err);
	}
		
	return data;
}

function exists(pathname) {
	const localPath = join(webPath, pathname);
	
	return existsSync(localPath);
}


module.exports = {
	read,
	exists
};