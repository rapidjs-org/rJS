/**
 * GET handler: Approached upon asset request only.
 */

const config = {
	defaultPageName: "index"
};	// TODO: Allow for default file name and extension / type to be changed via configuration file?


const {basename, extname, join, dirname} = require("path");
const {existsSync} = require("fs");
const {gzipSync} = require("zlib");
const {parse: parseUrl} = require("url");

const utils = require("../utils");

const isDevMode = require("../support/is-dev-mode");
const webPath = require("../support/web-path");
const output = require("../support/output");
const locale = require("../support/locale");
const webConfig = require("../support/web-config").webConfig;
const mimesConfig = require("../support/web-config").mimesConfig;

const pluginManagement = require("../interface/plugin-management");
const fileRead = require("../interface/file").read;

const entityHook = require("./entity-hook");


const cache = {
	static: require("../interface/cache")(),
	dynamic: require("../interface/cache")(1000)
	// Very small caching duration for dynamic files (for saving ressources on load peaks)
};


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

	entityHook.respond(status, message);
}

function redirect(newPathname, urlParts) {
	entityHook.redirect(`${newPathname}${urlParts.search || ""}${urlParts.hash || ""}`);
}

/**
 * Respond by a simple response or redirecting to an error page depending on the request method.
 * @helper
 */
function respondWithError(entity, status = 500) {
	// Respond with error page contents if related file exists in the current or any parent directory (bottom-up search)
	if(!entity.pageRequest) {
		respond(entity, status);

		return;
	}

	// TODO: Build error tree successively to reduce computation throughout runtime?
	
	let errorPageDir = entity.url.pathname;
	do {
		errorPageDir = dirname(errorPageDir);

		const errorPagePath = join(errorPageDir, `${String(status)}.html`);
		if(existsSync(join(webPath, errorPagePath))) {
			entity.url.pathname = errorPagePath;
			utils.adaptUrl(entity);

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
	const reducedRequestObject = entity.reducedRequestObject;
	
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
 */
module.exports = entity => {
	let data;
	
	// Handle plug-in frontend module file requests individually and prioritized
	if(pluginManagement.isFrontendRequest(entity.url.pathname)) {
		entity.url.extension = "js";

		data = pluginManagement.retrieveFrontendModule(entity.url.pathname);
		
		respond(entity, data ? 200 : 404, data);

		return;
	}

	// Extract or assume requested file extension
	const urlParts = parseUrl(entity.req.url, true);

	entity.url.extension = (extname(urlParts.pathname).length > 0)
		? utils.normalizeExtension(extname(urlParts.pathname))
		: "html";

	// Block request if whitelist enabled but requested extension not stated
	// or a non-standalone file has been requested
	if(webConfig.extensionWhitelist
		&& !webConfig.extensionWhitelist.concat(["html", "js"]).includes(entity.url.extension)) {
		respondWithError(entity, 403);
		
		return;
	}

	(entity.url.extension == "html") && (entity.pageRequest = true);	// Whether a static file (non-page asset) has been requested

	// Redirect requests explicitly stating the default page or extension name to a request with an extensionless URL
	let explicitBase;
	if(entity.pageRequest
	&& (explicitBase = basename(urlParts.pathname).match(new RegExp(`(${config.defaultPageName})?(\\.html)?$`, "i")))
	&& explicitBase[0].length > 1) {
		redirect(urlParts.pathname.replace(explicitBase[0], ""), urlParts);
		
		return;
	}

	// Prepare request according to locale settings
	const reqInfo = locale.getInfo(entity);
	locale.prepare(entity);
	if(entity.pageRequest) {
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
			redirect(`${newLocale}${entity.url.pathname}`, urlParts);
			
			return;
		}

		utils.adaptUrl(entity);
	}
	
	// Set client-side cache control for static files
	(!isDevMode && !entity.pageRequest && webConfig.cachingDuration.client)
	&& (entity.res.setHeader("Cache-Control", `max-age=${webConfig.cachingDuration.client}`));

	// Use cached data if is static file request (and not outdated)
	const respCache = cache[!entity.pageRequest ? "static" : "dynamic"];
	if(respCache.has(entity.url.pathname)) {
		data = respCache.read(entity.url.pathname);

		respond(entity, 200, data);

		return;
	}
	
	try {
		data = !entity.pageRequest ? processStaticFile(entity) : processDynamicFile(entity);
		
		// Set server-side cache
		!entity.pageRequest && respCache.write(entity.url.pathname, data);

		respond(entity, 200, data);

		return;
	} catch(err) {
		output.error(err);
		
		respondWithError(entity, err.status);
	}
};