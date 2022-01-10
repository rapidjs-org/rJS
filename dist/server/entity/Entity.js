"use strict";
/**
 * @class
 * General request/response entity class representing an interface for
 * respective manipulations. Provides general, definite methods for response
 * behavior.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = void 0;
const http_1 = require("http");
const url_1 = require("url");
const config_server_1 = __importDefault(require("../../config/config.server"));
const tlds_json_1 = __importDefault(require("../support/tlds.json"));
// Initially construct locale matching regex based on configured (supported) languages
const localeMode = {
    full: config_server_1.default.locale.languages.supported && config_server_1.default.locale.countries.supported,
    partial: (config_server_1.default.locale.languages.supported || config_server_1.default.locale.countries.supported)
};
const joinLocale = localeArray => {
    return localeArray
        ? localeArray.join("|")
        : "";
};
const localeMatchRegex = localeMode.partial
    ? new RegExp(`^/(${joinLocale(config_server_1.default.locale.languages.supported)})?(${localeMode.full ? "-" : ""})?(${joinLocale(config_server_1.default.locale.countries.supported)})?/`)
    : null;
// TODO: Locale fs map
class Entity {
    /**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
    constructor(req, res) {
        this.cookies = {
            received: {},
            set: {}
        };
        // Identically store original request/response objects
        this.req = req;
        this.res = res;
        // Construct URL object for request
        this.url = new url_1.URL(`${config_server_1.default.port.https ? "https" : "http"}://${this.getHeader("host")}${req.url}`);
        this.originalPathname = this.url.pathname;
    }
    /**
     * Get header information from entity (request).
     * @param {string} key Header key
     * @returns {string} value Header value
     */
    getHeader(key) {
        const header = this.req.headers[key] || this.req.headers[key.toLowerCase()];
        return header
            ? String(header)
            : undefined;
    }
    /**
     * Set header information for entity (response).
     * @param {string} key Header key
     * @param {string|number} value Header value
     */
    setHeader(key, value) {
        this.res.setHeader(key, value);
    }
    /**
     * Close entity by performing a response with an individual message.
     * @param {number} status Status code
     * @param {Buffer} [message] Message data
     */
    respond(status, message) {
        // Use generic message if none explicitly given / retrieved processing
        message = message || Buffer.from(http_1.STATUS_CODES[String(status)], "utf-8");
        // Whether server uses a secure connection
        const isSecure = config_server_1.default.port.https ? true : false;
        /*
         * Set specific headers.
         */
        this.setHeader("Server", "rapidJS"); // Keep?
        this.setHeader("X-XSS-Protection", "1");
        this.setHeader("X-Powered-By", null);
        this.setHeader("Content-Length", Buffer.byteLength(message, "utf-8"));
        isSecure
            && this.setHeader("Strict-Transport-Security", `max-age=${config_server_1.default.cachingDuration.client}; includeSubDomains`);
        // Write set cookies to respective header
        const setCookieArray = [];
        for (const cookie in this.cookies.set) {
            // TODO: Keep attributes if was received
            setCookieArray.push(`${cookie}=${this.cookies.set[cookie].value}; path=${this.originalPathname}${this.cookies.set[cookie].maxAge ? `; Max-Age=${this.cookies.set[cookie].maxAge}` : ""}${isSecure ? `; SameSite=Strict; Secure; HttpOnly` : ""}`);
        }
        this.res.setHeader("Set-Cookie", setCookieArray);
        // Set status code
        this.res.statusCode = isNaN(status) ? 500 : status;
        // End request with message
        this.res.end(message);
    }
    /**
     * Close entity by performing a redirect to a given pathname.
     * @param {string} pathnanme - Path to redirect to
     * @param {string} [hostname] - Host to redirect to
     */
    redirect(pathname, hostname) {
        this.url.pathname = pathname;
        hostname && (this.url.hostname = hostname);
        this.res.setHeader("Location", this.url.toString());
        this.res.statusCode = 301;
        this.res.end();
    }
    process() {
        /*
         * Parse request cookies.
         */
        const cookieStr = this.getHeader("Cookie");
        cookieStr && cookieStr
            .split(";")
            .filter(cookie => (cookie.length > 0))
            .forEach(cookie => {
            const parts = cookie.split("=");
            this.cookies.received[parts.shift().trim()] = decodeURI(parts.join("="));
        });
        /*
         * Retrieve subdomain(s) and store in array (partwise).
         */
        let subdomain;
        // Trim TLD suffix from hostname
        const specialNameRegex = /([0-9]+(\.[0-9]+)*|(\.)?localhost)$/;
        if (specialNameRegex.test(this.url.hostname)) {
            // Local or numerical hostname
            subdomain = this.url.hostname
                .replace(specialNameRegex, "");
        }
        else {
            // Retrieve TLD (second level if given, first level otherwise)
            const suffix = this.url.hostname.match(/(\.[^.]+)?(\.[^.]+)$/);
            if (!tlds_json_1.default.includes(suffix[0].slice(1))
                && suffix[1]) {
                suffix[0] = suffix[2];
            }
            subdomain = this.url.hostname.slice(0, -suffix[0].length);
        }
        // Partwise array representation
        this.subdomain = subdomain
            .split(/\./g)
            .filter(part => (part.length > 0));
        /*
         * Retrieve locale information and store in locale object.
         */
        if (!localeMatchRegex) {
            // Locale processing not enabled
            return;
        }
        this.locale = {};
        const code = this.url.pathname.match(localeMatchRegex);
        if (!code
            || code[1] && code[3] && !code[2]) {
            // Invalid locale prefix provided
            return;
        }
        // Remove leading locale part from internal pathname
        // (as must not effect fs)
        this.url.pathname = this.url.pathname.slice(code[0].length);
        this.locale.lang = code[1];
        this.locale.country = code[3];
    }
    /**
     * Get entity related reduced request info object.
     * Enables client request individual behavior (multi interface scope).
     * @returns {IReducedRequestInfo} Common reduced request info object (to be defined in accordance with sub entity behavior)
     */
    getReducedRequestInfo() {
        // TODO: Relevant headers (auth)?
        return {
            ip: this.getHeader("X-Forwarded-For") || this.req.connection.remoteAddress,
            subdomain: this.subdomain,
            locale: this.locale,
            // Cookies manipulation interface
            cookies: {
                /**
                 * Get a request cookie by name.
                 * @param {string} name Cookie name
                 * @returns {string|number|boolean} Cookie value (if defined)
                 */
                get: (name) => {
                    return this.cookies.set[name]
                        ? this.cookies.set[name].value
                        : this.cookies.received[name];
                },
                /**
                 * Set a response cookie.
                 * @param {string} name Cookie name
                 * @param {string|number|boolean} Cookie value to set
                 * @param {number} [maxAge] Cookie life time in seconds (considered a session cookie if is undefined)
                 */
                set: (name, value, maxAge) => {
                    this.cookies.set[name] = {
                        value: value,
                        maxAge: maxAge
                    };
                }
            }
        };
    }
}
exports.Entity = Entity;
