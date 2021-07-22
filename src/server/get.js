const config = {
	compoundObject: {
		name: "compoundPage",
		basePathProperty: "base",
		argumentsProperty: "args",
	},
	compoundPageDirPrefix: ":",
	defaultFileExtension: "html",
	defaultFileName: "index",
	supportFilePrefix: "_",
};


const {dirname, join, basename} = require("path");
const {existsSync} = require("fs");

const utils = require("../utils");

const response = require("./response");

const output = require("../interface/output");
const reader = require("../interface/reader");
const responseModifier = require("../interface/response-modifier");

const webConfig = require("../support/config").webConfig;
const mimesConfig = require("../support/config").mimesConfig;
const isDevMode = require("../support/is-dev-mode");
const webPath = require("../support/web-path");
const gzip = require("../support/gzip");

const frontendManagement = require("./frontend-management");

const staticCache = require("../support/cache");


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
		message = gzip(message);
	}

	response.respond(entity, status, message);
}

/**
 * Respond by a simple response or redirecting to an error page depending on the request method.
 * @helper
 */
function respondWithError(entity, status) {
	// Respond with error page contents if related file exists in the current or any parent directory (bottom-up search)
	if(entity.url.extname == config.defaultFileExtension) {
		respond(entity, status);
	}

	let errorPageDir = entity.url.pathname;
	do {
		errorPageDir = dirname(errorPageDir);

		let errorPagePath = join(errorPageDir, String(status));
        
		if(existsSync(`${join(webPath, errorPagePath)}.html`)) {
			let data = processFile(entity.req, false, errorPagePath, config.defaultFileExtension, null);
            
			// Normalize references by updating the base URL accordingly (as will keep error URL in frontend)
			data = utils.injectIntoHead(data, `
            <script>
                const base = document.createElement("base");
                base.setAttribute("href", document.location.protocol + "//" + document.location.host + "${errorPageDir}");
                document.querySelector("head").appendChild(base);
                document.currentScript.parentNode.removeChild(document.currentScript);
            </script>`);	// TODO: Efficitenly retrieve hostname to insert base tag already

			respond(entity.res, status, data);

			return;
		}
	} while(errorPageDir != "/");

	// Simple response
	respond(entity, status);
}


function processFile(req, isStaticRequest, pathname, extension, queryParameterObj) {
	// Add default file name if none explicitly stated in request URL
	pathname = pathname.replace(/\/$/, `/${config.defaultFileName}`);

	let localPath = join(webPath, pathname);
	(extension == config.defaultFileExtension) && (localPath = `${localPath.replace(/\/$/, `/${config.defaultFileName}`)}.${config.defaultFileExtension}`);

	// Use compound page path if respective directory exists
	let compoundPath;
	if(!isStaticRequest) {
		compoundPath = "";
		const pathParts = pathname.replace(/^\//, "").split(/\//g) || [pathname];
		for(let part of pathParts) {
			// Construct possible internal compound path
			const localCompoundPath = join(webPath, compoundPath, `${config.compoundPageDirPrefix}${part}`, `${part}.${extension}`);
			
			compoundPath = join(compoundPath, part);

			// Return compound path if related file exists in file system
			if(existsSync(localCompoundPath)) {
				localPath = localCompoundPath;

				break;
			}
		}
		// TODO: Store already obtained compound page paths mapped to request pathnames in order to reduce computing compexity (cache?)?
		
		if(!compoundPath) {
			// Add default file extension if is not a compound page and none explicitly stated in request URL
			localPath += `.${extension}`;
		}
	}

	let data;

	// Read file either by custom reader handler or by default reader
	try {
		data = reader.useReader(extension, localPath);
	} catch(err) {
		output.error(err);
		
		throw err;
	}

	// Construct reduced request object to be passed to each response modifier handler
	const reducedRequestObject = {
		ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
		pathname: localPath,
		queryParameter: queryParameterObj
	};
	
	// Sequentially apply defined response modifiers (compound pages without extension use both empty and default extension handlers)
	try {
		data = responseModifier.applyResponseModifiers(extension, data, reducedRequestObject);
		
		compoundPath && (data = responseModifier.applyResponseModifiers(":html", data, reducedRequestObject));	// Compound page specific modifiers
	} catch(err) {
		output.log(`Error applying response modifiers for '${pathname}'`);
		output.error(err);
		
		throw err;
	}

	// Implement compound page information into compound pages
	if(compoundPath) {
		let serializedArgsArray = pathname.slice(compoundPath.length + 2)
			.split(/\//g)
			.filter(arg => arg.length > 0);
		serializedArgsArray = (serializedArgsArray.length > 0)
			? serializedArgsArray
				.map(arg => `"${arg}"`)
				.join(",")
			: null;
		
		data = utils.injectIntoHead(String(data), `
		<script>
			rapidJS.core.${config.compoundObject.name} = {
				${config.compoundObject.basePathProperty}: "/${compoundPath}",
				${config.compoundObject.argumentsProperty}: ${serializedArgsArray ? `[${serializedArgsArray}]`: "null"}
			};
			document.currentScript.parentNode.removeChild(document.currentScript);
		</script>`, true);
	}
	
	return data;
}

/**
 * Handle a GET request accordingly.
 * @param {Object} entity Open connection entity
 */
function handle(entity) {
	let data;
	
	if(frontendManagement.has(entity.url.pathname)) {
		data = frontendManagement.get(entity.url.pathname);

		entity.url.extension = "js";

		respond(entity, 200, data);
		
		return;
	}

	const isStaticRequest = entity.url.extension != config.defaultFileExtension;	// Whether a static file (non-page asset) has been requested
	
	// Set client-side cache control for static files
	(!isDevMode && isStaticRequest && webConfig.cachingDuration.client) && (entity.res.setHeader("Cache-Control", `max-age=${webConfig.cachingDuration.client}`));
	
	// Block request if whitelist enabled but requested extension not stated
	// or a non-standalone file has been requested
	if(webConfig.extensionWhitelist && !webConfig.extensionWhitelist.includes(entity.url.extension)
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
		data = processFile(entity.req, isStaticRequest, entity.url.pathname, entity.url.extension, entity.url.query);

		// Set server-side cache
		isStaticRequest && staticCache.write(entity.url.pathname, data);
		
		respond(entity, 200, data);
	} catch(err) {
		output.error(err);

		respondWithError(entity, err.status);
	}
}


module.exports = handle;