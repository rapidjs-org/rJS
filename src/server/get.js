const config = {
	compoundObject: {
		name: "compoundPage",
		basePathProperty: "base",
		argumentsProperty: "args",
	},
	compoundPageDirPrefix: ":",
	defaultFileName: "index"
};


const {dirname, join, basename} = require("path");
const {existsSync} = require("fs");
const {gzipSync} = require("zlib");

const utils = require("../utils");

const templating = require("../support/templating");

const webPath = require("../support/web-path");
const staticCache = require("../support/cache");
const output = require("../support/output");
const isDevMode = require("../support/is-dev-mode");

const webConfig = require("../support/config").webConfig;
const mimesConfig = require("../support/config").mimesConfig;

const frontendManagement = require("../interface/frontend-management");
const page = require("../interface/page");
const reader = require("../interface/reader");

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
	if(entity.url.extname != "html") {
		respond(entity, status);

		return;
	}

	let errorPageDir = entity.url.pathname;
	do {
		errorPageDir = dirname(errorPageDir);

		let errorPagePath = join(errorPageDir, String(status));
        
		if(existsSync(`${join(webPath, errorPagePath)}.html`)) {
			let data = processFile(entity, false, errorPagePath, "html", null);
            
			// Normalize references by updating the base URL accordingly (as will keep error URL in frontend)
			data = utils.injectIntoHead(data, `
            <script>
                const base = document.createElement("base");
                base.setAttribute("href", document.location.protocol + "//" + document.location.host + "${errorPageDir}");
                document.querySelector("head").appendChild(base);
                document.currentScript.parentNode.removeChild(document.currentScript);
            </script>`);	// TODO: Efficitenly retrieve hostname to insert base tag already

			respond(entity, status, data);

			return;
		}
	} while(errorPageDir != "/");

	// Simple response
	respond(entity, status);
}


function processFile(entity, isStaticRequest, pathname, extension, queryParameterObj) {
	// Add default file name if none explicitly stated in request URL
	pathname = pathname.replace(/\/$/, `/${config.defaultFileName}`);

	let localPath = pathname;
	
	!isStaticRequest && (localPath = `${localPath.replace(/\/$/, `/${config.defaultFileName}`)}.html`);

	// Use compound page path if respective directory exists
	let compoundPath;
	if(!isStaticRequest) {
		let isCompoundPage = false;

		compoundPath = "";
		const pathParts = pathname.replace(/^\//, "").split(/\//g) || [pathname];
		for(let part of pathParts) {
			// Construct possible internal compound path
			const localCompoundPath = join(compoundPath, `${config.compoundPageDirPrefix}${part}`, `${part}.${extension}`);
			
			compoundPath = join(compoundPath, part);

			// Return compound path if related file exists in file system
			if(existsSync(join(webPath, localCompoundPath))) {
				localPath = localCompoundPath;

				isCompoundPage = true;

				break;
			}
		}
		// TODO: Store already obtained compound page paths mapped to request pathnames in order to reduce computing compexity (cache?)?
		
		if(!isCompoundPage) {
			compoundPath = null;
		}
	}
	
	let data;

	// Construct reduced request object to be passed to each response modifier handler
	const reducedRequestObject = {
		ip: entity.req.headers["x-forwarded-for"] || entity.req.connection.remoteAddress,
		pathname: localPath,
		queryParameter: queryParameterObj
	};
	
	// Read file either by custom reader handler or by default reader
	try {
		data = reader.useReader(localPath);	// Pass red req obj?
	} catch(err) {
		if(err instanceof ReferenceError) {
			throw new (require("../interface/ClientError"))(404);
		}

		output.log("Error reading requested file:");

		throw err;
	}
	
	// No more processing on static file data
	if(isStaticRequest) {
		return data;
	}

	data = String(data);	// Further processig steps will need string representation of input

	// Sequentially apply defined plug-in module modifiers
	data = frontendManagement.integrateEnvironment(data, page.ANY);
	compoundPath && (data = frontendManagement.integrateEnvironment(data, page.COMPOUND));

	// Template includes
	data = templating.renderIncludes(data, localPath);
	
	if(!compoundPath) {
		return data;
	}

	// Template dynamics (compound page only; requires templating module)
	try {
		data = templating.renderDynamics(data, localPath, reducedRequestObject);
	} catch(err) {
		output.error(err, true);
	}

	// Implement compound page information into compound pages
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

	const isStaticRequest = entity.url.extension != "html";	// Whether a static file (non-page asset) has been requested
	
	// Set client-side cache control for static files
	(!isDevMode && isStaticRequest && webConfig.cachingDuration.client) && (entity.res.setHeader("Cache-Control", `max-age=${webConfig.cachingDuration.client}`));
	
	// Block request if whitelist enabled but requested extension not stated
	// or a non-standalone file has been requested
	if(webConfig.extensionWhitelist && !webConfig.extensionWhitelist.concat(["html", "js"]).includes(entity.url.extension)
	|| (new RegExp(`^${utils.supportFilePrefix}.+$`)).test(basename(entity.url.pathname))) {
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
		data = processFile(entity, isStaticRequest, entity.url.pathname, entity.url.extension, entity.url.query);

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