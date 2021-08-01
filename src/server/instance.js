const config = {
	defaultFileName: "index"
};	// TODO: Allow for default file name and extension / type to be changed via configuration file?


const {readFileSync} = require("fs");
const {extname, join, basename} = require("path");
const {parse: parseUrl} = require("url");

const utils = require("../utils");

const webConfig = require("../support/web-config").webConfig;
const webPath = require("../support/web-path");
const isDevMode = require("../support/is-dev-mode");
const rateLimiter = require("../support/rate-limiter");

const response = require("./response");

const output = require("../support/output");


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
const port = webConfig.portHttps || webConfig.portHttp;
require(webConfig.portHttps ? "https" : "http").createServer(options, (req, res) => {
	// Connection entity combining request and response objects; adding url information object
	const entity = {
		req: req,
		res: res,
		url: {}
	};
	entity.req.method = entity.req.method.toLowerCase();

	const urlParts = parseUrl(entity.req.url, true);
	entity.url.pathname = urlParts.pathname;
	entity.url.extension = (extname(urlParts.pathname).length > 0) ? utils.normalizeExtension(extname(urlParts.pathname)) : "html";
	entity.url.query = urlParts.query;

	try {
		handleRequest(entity);
	} catch(err) {
		output.error(err);

		res.end();
	}
}).listen(port, null, null, _ => {
	output.log(`Server started listening on port ${port}`);
	
	if(isDevMode) {
		output.log("Running DEV MODE");
	}
});
// Create HTTP to HTTPS redirect server if both ports set up
if(webConfig.portHttps && webConfig.portHttp) {
	require("http").createServer((req, res) => {
		response.redirect(res, `https://${req.headers.host}${req.url}`);
	}).listen(webConfig.portHttp, null, null, _ => {
		output.log(`HTTP (:${webConfig.portHttp}) to HTTPS (:${webConfig.portHttps}) redirection enabled`);
	});
}


/**
 * Handle a single request.
 * @param {Object} entity Connection entity
 */
function handleRequest(entity) {
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
	let explicitBase;
	if((explicitBase = basename(entity.url.pathname).match(new RegExp(`^(${config.defaultFileName})?(\\.html)?$`)))
		&& explicitBase[0].length > 1) {
		const newUrl = entity.url.pathname.replace(explicitBase[0], "")
                     + (parseUrl(entity.req.url).search || "");
        
		response.redirect(entity.res, newUrl);

		return;
	}

	// Set basic response headers
	webConfig.portHttps && (entity.res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
	webConfig.allowFramedLoading && (entity.res.setHeader("X-Frame-Options", "SAMEORIGIN"));

	entity.res.setHeader("X-XSS-Protection", "1");
	entity.res.setHeader("X-Powered-By", null);
	
	// Apply the related handler
	switch(entity.req.method) {
	case "get":
		requestHandler.GET(entity);
		break;
	case "post":
		requestHandler.POST(entity);
		break;
	}
}