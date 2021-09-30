const {readFileSync} = require("fs");
const {join} = require("path");
const {parse: parseUrl} = require("url");

const webConfig = require("../support/web-config").webConfig;
const isDevMode = require("../support/is-dev-mode");
const rateLimiter = require("../support/rate-limiter");
const output = require("../support/output");

const entityHook = require("./entity-hook");


const requestHandler = {
	get: require("./get"),
	post: require("./post")
};


// Create web server instance
const options = {};
if(!isDevMode && webConfig.ssl) {
	const readCertFile = pathname => {
		pathname = (pathname.charAt(0) == "/") ? pathname : join(require("../support/web-path"), pathname);
		return readFileSync(pathname);
	};

	options.cert = webConfig.ssl.certFile ? readCertFile(webConfig.ssl.certFile) : null;
	options.key = webConfig.ssl.keyFile ? readCertFile(webConfig.ssl.keyFile) : null;
	options.dhparam = webConfig.ssl.dhParam ? readCertFile(webConfig.ssl.dhParam) : null;
}

const checkPort = (port, method) => {
	isNaN(port) && output.error(new TypeError(`Configured ${method} port must be of type Number, given ${typeof(port)} instead.`), true);
}
checkPort(webConfig.port.http, "HTTP");
checkPort(webConfig.port.https, "HTTPS");

const protocol = isDevMode
	? "http"
	: (webConfig.port.https
		? "https"
		: "http");

// Create main server depending on set ports
require(protocol)
	.createServer(options, (req, res) => {
		req.method = req.method.toLowerCase();

		entityHook.create(req, res);
		
		handleRequest()
			.catch(err => {
				output.error(err);

				res.end();
			});
	})
	.listen(webConfig.port[protocol],
		!isDevMode ? webConfig.hostname : null,
		!isDevMode ? webConfig.maxPending : null,
		_ => {
			output.log(`Server started listening on port ${webConfig.port[protocol]}`);
	
			if(isDevMode) {
				output.log("Running DEV MODE");
			}
		});

// Create HTTP to HTTPS redirect server if both ports set up
if(webConfig.port.https && webConfig.port.http) {
	require("http").createServer(req => {
		entityHook.redirect(`https://${req.headers.host}${req.url}`);
	}).listen(webConfig.port.http, webConfig.hostname || null, webConfig.maxPending || null, _ => {
		output.log(`HTTP (:${webConfig.port.http}) to HTTPS (:${webConfig.port.https}) redirection enabled`);
	});
}


/**
 * Handle a single request.
 */
async function handleRequest() {
	const entity = entityHook.current();

	webConfig.port.https
	&& entity.res.setHeader("Strict-Transport-Security", `max-age=${webConfig.cachingDuration.client}; includeSubDomains`);

	// Block request if method not allowed
	if(!requestHandler[entity.req.method]) {
		entityHook.respond(entity, 405);

		return;
	}
	// Block request if URL is exceeding the maximum length
	if(entity.req.url.length > webConfig.maxUrlLength) {
		entityHook.respond(entity, 414);

		return;
	}
	// Block request if individual request maximum reached
	if(rateLimiter.mustBlock(entity.req.connection.remoteAddress)) {
		entity.res.setHeader("Retry-After", 30000);
		entityHook.respond(entity, 429);

		return;
	}

	webConfig.allowFramedLoading && (entity.res.setHeader("X-Frame-Options", "SAMEORIGIN"));
	
	entity.res.setHeader("X-XSS-Protection", "1");
	entity.res.setHeader("X-Powered-By", null);

	const urlParts = parseUrl(entity.req.url);
	entity.url.pathname = urlParts.pathname;
	entity.url.query = urlParts.query;
	
	// Extract and store subdomain(s)
	const hostParts = (entity.req.headers.host.match(/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+/i) || [""])[0]
		.split(/\./g)
		.slice(0, -1);
	entity.url.subdomain = (entity.req.headers.host.match(/localhost(:[0-9]+)?$/i))
	? hostParts
	: hostParts.slice(0, -1);	// TODO: Adapt for accordance with second level TLDs (e.g. co.nz); includes domain name at the moment for such cases
	entity.url.host = entity.req.headers.host.match(new RegExp(`([a-z0-9]([a-z0-9-]*[a-z0-9])?\.){${hostParts.length - entity.url.subdomain.length}}[^.]+$`))[0];
	
	// Apply the related request handler
	requestHandler[entity.req.method](entity);
}