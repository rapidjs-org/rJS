const config = {
	supportFilePrefix: "_"	// TODO: Used among two modules, fix
};


const {join, extname, dirname, basename} = require("path");
const {existsSync} = require("fs");
const {gzipSync} = require("zlib");
const {parse: parseUrl} = require("url");

const utils = require("../utils");

const isDevMode = require("../support/is-dev-mode");
const webPath = require("../support/web-path");
const output = require("../support/output");
const i18n = require("../support/i18n");
const templating = require("../support/templating");
const webConfig = require("../support/web-config").webConfig;
const mimesConfig = require("../support/web-config").mimesConfig;

const readFile = require("../interface/reader");
const staticCache = require("../interface/cache")();
const pluginManagement = require("../interface/plugin-management");
const Environment = require("../interface/Environment");
const ClientError = require("../interface/ClientError");

const response = require("./response");


function respond(entity, status, message) {
	// Set MIME type header accordingly
	const mime = mimesConfig[entity.url.extension];
	if(mime) {
		entity.res.setHeader("Content-Type", mime);
		entity.res.setHeader("X-Content-Type-Options", "nosniff");
	}
	
	// Check GZIP compression header if to to compress response data
	if(/(^|[, ])gzip($|[ ,])/.test(entity.req.headers["Accept-Encoding"] || "") && webConfig.gzipCompressList.includes(entity.url.extension)) {
		entity.res.setHeader("Content-Encoding", "gzip");
		message = gzipSync(message);
	}

	response.respond(entity, status, message);
}

/**
 * Respond by a simple response or redirecting to an error page depending on the request method.
 * @helper
 */
function respondWithError(entity, status) {
	// Respond with error page contents if related file exists in the current or any parent directory (bottom-up search)
	if(entity.url.extension != "html") {
		respond(entity, status);

		return;
	}

	// TODO: Build error tree successively to reduce computation throughout runtime?
	
	let errorPageDir = entity.url.pathname;
	do {
		errorPageDir = dirname(errorPageDir);

		const errorPagePath = join(errorPageDir, `${String(status)}.html`);
        
		if(existsSync(join(webPath, errorPagePath))) {
			entity.url = {
				...entity.url,
				...utils.getPathInfo(errorPagePath)
			};

			let data = processFile(entity, false, errorPagePath);
			
			// Normalize references by updating the base URL accordingly
			data = utils.injectIntoHead(data, `
			<base href="http${webConfig.port.https ? "s" : ""}://${entity.req.headers["host"]}"></base>`);

			respond(entity, status, data);

			return;
		}
	} while(errorPageDir != "/");

	// Simple response
	respond(entity, status);
}


function processFile(entity, isStaticRequest, pathname) {
	let data;
	
	// Read file either by custom reader handler or by default reader
	try {
		data = readFile(pathname);
	} catch(err) {
		throw new ClientError(404);
	}
	
	// No more processing on static file data
	if(isStaticRequest) {
		return data;
	}

	data = String(data);	// Further processig steps will need string representation of input

	// Sequentially apply defined plug-in module modifiers
	data = pluginManagement.buildEnvironment(data, Environment.ANY);
	entity.url.isCompound && (data = pluginManagement.buildEnvironment(data, Environment.COMPOUND));

	const reducedRequestObject = utils.createReducedRequestObject(entity);
		
	// Template includes
	data = templating.renderIncludes(data, reducedRequestObject);
	
	// No more processing on default page markup data
	if(!entity.url.isCompound) {
		return data;
	}

	// Template dynamics (compound page only; requires templating module)
	try {
		data = templating.renderDynamics(data, reducedRequestObject);
	} catch(err) {
		output.error(err, true);
	}

	return data;
}

/**
 * Handle a GET request accordingly.
 * @param {Object} entity Open connection entity
 */
function handle(entity) {
	const urlParts = parseUrl(entity.req.url, true);
	entity.url.pathname = i18n.adjustPathname(urlParts.pathname);
	
	let data;

	if(data = pluginManagement.retrieveFrontendModule(entity.url.pathname)) {
		entity.url.extension = "js";

		respond(entity, 200, data);
		
		return;
	}

	entity.url.extension = (extname(urlParts.pathname).length > 0) ? utils.normalizeExtension(extname(urlParts.pathname)) : "html";
	
	const isStaticRequest = entity.url.extension != "html";	// Whether a static file (non-page asset) has been requested
	
	// Prepare request according to i18n settings
	if(!isStaticRequest) {
		entity.url = i18n.prepare(entity.url);
		entity.url.base && (entity.url.base = i18n.adjustPathname(entity.url.base));

		entity.url = {
			...entity.url,
			...utils.getPathInfo(entity.url.pathname)
		};
	};
	entity.url.query = urlParts.query;

	// Set client-side cache control for static files
	(!isDevMode && isStaticRequest && webConfig.cachingDuration.client) && (entity.res.setHeader("Cache-Control", `max-age=${webConfig.cachingDuration.client}`));
	
	// Block request if whitelist enabled but requested extension not stated
	// or a non-standalone file has been requested
	if(webConfig.extensionWhitelist && !webConfig.extensionWhitelist.concat(["html", "js"]).includes(entity.url.extension)
	|| (new RegExp(`^${config.supportFilePrefix}.+$`)).test(basename(entity.url.pathname))) {
		respondWithError(entity, 403);
		
		return;
	}

	// Use cached data if is static file request (and not outdated)
	if(isStaticRequest && staticCache.has(entity.url.pathname)) {
		data = staticCache.read(entity.url.pathname);

		respond(entity, 200, data);

		return;
	}

	try {
		data = processFile(entity, isStaticRequest, entity.url.pathname);
		
		// Set server-side cache
		isStaticRequest && staticCache.write(entity.url.pathname, data);
		
		respond(entity, 200, data);

		return;
	} catch(err) {
		output.error(err);

		respondWithError(entity, err.status);
	}
}


module.exports = handle;