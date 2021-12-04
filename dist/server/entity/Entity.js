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
const path_1 = require("path");
const web_path_1 = __importDefault(require("../../utilities/web-path"));
const config_server_1 = __importDefault(require("../../config/config.server"));
class Entity {
    /**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
    constructor(req, res) {
        // Identically store original request/response objects
        this.req = req;
        this.res = res;
        this.url = new url_1.URL(req.url);
    }
    /**
     * Construct local disc path to asset ressource.
     * @returns {String} Local ressource path
     */
    localPath() {
        return (0, path_1.join)(web_path_1.default, this.url.pathname);
    }
    /**
     * Retrieve header information from entity (request).
     * @param {string} key Header key
     * @returns {string} value Header value
     */
    getHeader(key) {
        return String(this.req.headers[key] || this.req.headers[key.toLowerCase()]);
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
        // Set headers
        this.setHeader("Server", "rapidJS"); // Keep?
        this.setHeader("X-XSS-Protection", "1");
        this.setHeader("X-Powered-By", null);
        this.setHeader("Content-Length", Buffer.byteLength(message, "utf-8"));
        config_server_1.default.port.https
            && this.setHeader("Strict-Transport-Security", `max-age=${config_server_1.default.cachingDuration.client}; includeSubDomains`);
        // Set status code
        this.res.statusCode = isNaN(status) ? 500 : status;
        // End request with message
        this.res.end(message || http_1.STATUS_CODES[this.res.statusCode]);
    }
    /**
     * Close entity by performing a redirect to a given pathname.
     * @param {string} path - Path to redirect to
     */
    redirect(pathname) {
        this.res.setHeader("Location", pathname);
        this.res.statusCode = 301;
        this.res.end();
    }
    /**
     * Get entity related reduced request info object.
     * Enables client request individual behavior (multi interface scope).
     * @returns {IReducedRequestInfo} Reduced request info object
     */
    getReducedRequestInfo() {
        return {
            ip: this.getHeader("X-Forwarded-For") || this.req.connection.remoteAddress,
            //subdomain: entity.url.subdomain,
            pathname: this.url.pathname
        };
    }
}
exports.Entity = Entity;
