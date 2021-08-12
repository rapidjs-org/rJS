const config = {
	supportFilePrefix: "_"	// TODO: Used among two modules, fix
};


const {join, dirname, basename} = require("path");
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
const ClientError = require("../interface/ClientError");
const fileRead = require("../interface/file").reader.apply;
const {setContext} = require("../interface/file");

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
			entity.url = utils.getPathInfo({
				...entity.url,
				... {
					pathname: errorPagePath
				}
			});

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
	
	const reducedRequestObject = utils.createReducedRequestObject(entity);
	
	setContext(reducedRequestObject);	// TODO: Check for asnc race cond (could use queue for fix)
	
	// Read file either by custom reader handler or by default reader
	try {
		data = fileRead(pathname, reducedRequestObject);
	} catch(err) {
		throw new ClientError(404);
	}
	
	// No more processing on static file data
	if(isStaticRequest) {
		return data;
	}
	
	// TODO: Lang
	data = locale.translate(String(data), reducedRequestObject);
	
	// Sequentially apply defined plug-in module modifiers
	data = pluginManagement.buildEnvironment(data, entity.url.isCompound);

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
	if(webConfig.extensionWhitelist && !webConfig.extensionWhitelist.concat(["html", "js"]).includes(entity.url.extension)
	|| (new RegExp(`^${config.supportFilePrefix}.+$`)).test(basename(entity.url.pathname))) {
		respondWithError(entity, 403);
		
		return;
	}

	const isStaticRequest = entity.url.extension != "html";	// Whether a static file (non-page asset) has been requested

	// TODO: Improve lang redirect (and locale handling)
	// Prepare request according to locale settings
	const origPathname = entity.url.pathname;
	entity.url = locale.prepare(entity.url);
	if(!isStaticRequest) {
		const origInfo = locale.getInfo(origPathname);
		const redirectLang = origInfo.lang && (!entity.url.lang || entity.url.lang == locale.defaultLang);
		const redirectCountry = origInfo.country && !entity.url.country;
		if(redirectLang || redirectCountry) {
			let redirectPathname = origPathname;
			redirectPathname = !redirectLang ? redirectPathname
				: redirectPathname
					.replace(new RegExp(`^\\/${origInfo.lang}`), "")
					.replace(/^(-|$)/, "/");
			redirectPathname = !redirectCountry ? redirectPathname
				: redirectPathname
					.replace(new RegExp(`(\\/|-)${origInfo.country}`), "");
			
			response.redirect(entity, redirectPathname);
			
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