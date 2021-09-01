const config = {
	defaultFileName: "index"
};	// TODO: Allow for default file name and extension / type to be changed via configuration file?


const {readFileSync} = require("fs");
const {join, basename, extname} = require("path");
const {parse: parseUrl} = require("url");

const utils = require("../utils");

const webConfig = require("../support/web-config").webConfig;
const webPath = require("../support/web-path");
const isDevMode = require("../support/is-dev-mode");
const rateLimiter = require("../support/rate-limiter");
const output = require("../support/output");

const response = require("./response");


const requestHandler = {
	GET: require("./get"),
	POST: require("./post")
};


// Create web server instance

const options = {};
if(webConfig.ssl) {
	options.cert = webConfig.ssl.certFile ? readCertFile(webConfig.ssl.certFile) : null;
	options.key = webConfig.ssl.keyFile ? readCertFile(webConfig.ssl.keyFile) : null;
	options.dhparam = webConfig.ssl.dhParam ? readCertFile(webConfig.ssl.dhParam) : null;
}

function readCertFile(pathname) {
	pathname = (pathname.charAt(0) == "/") ? pathname : join(webPath, pathname);
	return readFileSync(pathname);
}

// Create main server depending on set ports
const port = webConfig.port.https || webConfig.port.http;
require(webConfig.port.https ? "https" : "http").createServer(options, (req, res) => {
	// Connection entity combining request and response objects; adding url information object
	const entity = {
		req: req,
		res: res,
		url: {}
	};
	entity.req.method = entity.req.method.toLowerCase();

	handleRequest(entity)
		.catch(err => {
			output.error(err);

			res.end();
		});
}).listen(port, webConfig.hostname || null, webConfig.maxPending || null, _ => {
	output.log(`Server started listening on port ${port}`);
	
	if(isDevMode) {
		output.log("Running DEV MODE");
	}
});
// Create HTTP to HTTPS redirect server if both ports set up
if(webConfig.port.https && webConfig.port.http) {
	require("http").createServer((req, res) => {
		response.redirect(res, `https://${req.headers.host}${req.url}`);
	}).listen(webConfig.port.http, webConfig.hostname || null, webConfig.maxPending || null, _ => {
		output.log(`HTTP (:${webConfig.port.http}) to HTTPS (:${webConfig.port.https}) redirection enabled`);
	});
}


/**
 * Handle a single request.
 * @param {Object} entity Connection entity
 */
async function handleRequest(entity) {
	// Block request if maximum 
	if(rateLimiter.mustBlock(entity.req.connection.remoteAddress)) {
		entity.res.setHeader("Retry-After", 30000);
		response.respond(entity, 429);

		return;
	}
	// Block request if URL is exceeding the maximum length
	if(entity.req.url.length > webConfig.maxUrlLength) {
		response.respond(entity, 414);

		return;
	}
	// Block request if method not allowed
	if(!["get", "post"].includes(entity.req.method)) {
		response.respond(entity, 405);

		return;
	}

	// Redirect requests explicitly stating the default file or extension name to a request with an extensionless URL
	const urlParts = parseUrl(entity.req.url, true);
	let explicitBase;
	if((explicitBase = basename(urlParts.pathname).match(new RegExp(`^(${config.defaultFileName})?(\\.html)?$`)))
		&& explicitBase[0].length > 1) {
		const newUrl = urlParts.pathname.replace(explicitBase[0], "")
                     + (urlParts.search || "");
        
		response.redirect(entity, newUrl);

		return;
	}

	// Set basic response headers
	webConfig.port.https && (entity.res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
	webConfig.allowFramedLoading && (entity.res.setHeader("X-Frame-Options", "SAMEORIGIN"));

	entity.res.setHeader("X-XSS-Protection", "1");
	entity.res.setHeader("X-Powered-By", null);

	entity.url.pathname = urlParts.pathname;
	entity.url.query = urlParts.query;

	const subdomains = (entity.req.headers.host.match(/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+/i) || [""])[0]
		.split(/\./g)
		.filter(sub => (sub.length > 0));
	entity.url.subdomain = subdomains ? ((subdomains.length > 1) ? subdomains : subdomains[0]) : undefined;
	
	// Apply the related handler
	switch(entity.req.method) {
	case "get":
		entity.url.extension = (extname(urlParts.pathname).length > 0) ? utils.normalizeExtension(extname(urlParts.pathname)) : "html";
		
		requestHandler.GET(entity);
		break;
	case "post":
		// TODO: Add language in post request
		requestHandler.POST(entity);
		break;
	}
}