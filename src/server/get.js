/**
 * GET handler: Approached upon asset request only.
 */

const {join, dirname} = require("path");
const {existsSync} = require("fs");
const {gzipSync} = require("zlib");

const utils = require("../utils");

const isDevMode = require("../support/is-dev-mode");
const webPath = require("../support/web-path");
const output = require("../support/output");
const locale = require("../support/locale");
const webConfig = require("../support/web-config").webConfig;
const mimesConfig = require("../support/web-config").mimesConfig;

const staticCache = require("../interface/cache")();
const pluginManagement = require("../interface/plugin-management");

const fileRead = require("../interface/file").read;

const response = require("./response");


function normalizeBaseUrl(data, host, pathname) {
	// Normalize references by updating the base URL accordingly
	data = utils.injectIntoHead(data, `
	<base href="http${webConfig.port.https ? "s" : ""}://${host}${pathname}">`);

	return data;
}

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
function respondWithError(entity, status = 500) {
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
			entity.url = utils.getPathInfo({
				...entity.url,
				... {
					pathname: errorPagePath
				}
			});

			let data = processDynamicFile(entity, errorPagePath);
			
			data = normalizeBaseUrl(data, entity.req.headers["host"], errorPageDir);

			respond(entity, status, data);

			return;
		}
	} while(errorPageDir != "/");

	// Simple response
	respond(entity, status);
}


function processStaticFile(entity) {
	return fileRead(entity.url.pathname);
}

function processDynamicFile(entity, pathname) {
	const reducedRequestObject = utils.createReducedRequestObject(entity);
	
	let data = fileRead(pathname || entity.url.pathname, reducedRequestObject);
	
	// Sequentially apply defined plug-in module modifiers
	data = pluginManagement.buildEnvironment(data, entity.url.isCompound);

	if(!entity.url.isCompound) {
		return data;
	}

	data = normalizeBaseUrl(data, entity.req.headers["host"], entity.url.base);

	return data;
}


/**
 * Handle a GET request accordingly.
 * @param {Object} entity Open connection entity
 */
function handle(entity) {
	let data;

	if(pluginManagement.isFrontendRequest(entity.url.pathname)) {
		entity.url.extension = "js";

		data = pluginManagement.retrieveFrontendModule(entity.url.pathname);
		
		respond(entity, data ? 200 : 404, data);

		return;
	}

	// Block request if whitelist enabled but requested extension not stated
	// or a non-standalone file has been requested
	if(webConfig.extensionWhitelist
		&& !webConfig.extensionWhitelist.concat(["html", "js"]).includes(entity.url.extension)) {
		respondWithError(entity, 403);
		
		return;
	}

	const isStaticRequest = entity.url.extension != "html";	// Whether a static file (non-page asset) has been requested

	// Prepare request according to locale settings
	const reqInfo = locale.getInfo(entity.url);
	entity.url = locale.prepare(entity.url, entity.req.headers["accept-language"]);
	if(!isStaticRequest) {
		const newLocale = reqInfo.country
			? entity.url.country
				? (locale.getDefault(entity.url.country) == reqInfo.lang
					? `/${entity.url.country}`
					: null
				)
				: (locale.getDefault() == reqInfo.lang
					? ""
					: `/${entity.url.lang}`
				)
			: (reqInfo.lang
				? locale.getDefault() == reqInfo.lang
					? ""
					: null
				: null
			);
		
		if(utils.isString(newLocale)) {
			response.redirect(entity, `${newLocale}${entity.url.pathname}`);
			
			return;
		}

		entity.url = utils.getPathInfo(entity.url);
	}
	
	// Set client-side cache control for static files
	(!isDevMode && isStaticRequest && webConfig.cachingDuration.client) && (entity.res.setHeader("Cache-Control", `max-age=${webConfig.cachingDuration.client}`));

	// Use cached data if is static file request (and not outdated)
	if(isStaticRequest && staticCache.has(entity.url.pathname)) {
		data = staticCache.read(entity.url.pathname);

		respond(entity, 200, data);

		return;
	}
	
	try {
		data = isStaticRequest ? processStaticFile(entity) : processDynamicFile(entity);
		
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