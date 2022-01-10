"use strict";
/**
 * @class
 * Class representing a GET request specific entitiy.
 * To be served without being affected by custom
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicGetEntity = void 0;
const config_json_1 = __importDefault(require("../../config.json"));
const config = Object.assign(Object.assign({}, config_json_1.default), { compoundPageDirPrefix: "#", dynamicFileDefaultName: "index" });
const fs_1 = require("fs");
const path_1 = require("path");
const config_server_1 = __importDefault(require("../../config/config.server"));
const markup_1 = require("../../utilities/markup");
const modifiers_1 = require("../../mods/modifiers");
const ResponseError_1 = require("../../interface/ResponseError/ResponseError");
const registry_1 = require("../../interface/plugin/registry");
const server_1 = require("../../live/server");
const GetEntity_1 = require("./GetEntity");
// TODO: 404 fs structure map
// TODO: compound page structure map
class DynamicGetEntity extends GetEntity_1.GetEntity {
    /**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
    constructor(req, res) {
        super(req, res);
        this.isCompound = false;
        this.extension = config.dynamicFileExtension;
    }
    /**
     * Convert the current (conventional page) URL pathname to the compound equivalent
     * Applies sideffect to URL pathname property.
     * Compound path (internal) to use requested file name as directory prefixed with
     * the designated indicator. Actual file to be appended then.
     * @returns {string} Converted pathname representation
     */
    pathnameToCompound() {
        return (0, path_1.join)((0, path_1.dirname)(this.url.pathname), `${config.compoundPageDirPrefix}${(0, path_1.basename)(this.url.pathname).replace(/\.[a-z0-9]+$/i, "")}`, (0, path_1.basename)(this.url.pathname));
    }
    /**
     * Convert the current (compound page) URL pathname to the conventional equivalent
     * Inverse of pathnameToCompound().
     * @returns {string} Converted pathname representation
     */
    pathnameToConventional() {
        return decodeURIComponent(this.url.pathname)
            .replace(new RegExp(`/${config.compoundPageDirPrefix}([^/]+)/\\1$`), "/$1");
    }
    /**
     * Construct local disc path to asset ressource.
     * @returns {String} Local ressource path
     */
    localPath() {
        return `${super.localPath()}.${this.extension}`;
    }
    /**
     * Read the dynamic asset (file) implicitly linked to the request.
     * Apply the registered modification handlers accordingly
     * @returns {Buffer} Modified dynamic asset (file) contents.
     */
    read() {
        let contents = String(super.read());
        // Apply registered dynamic file modifiers (plug-in integration, templating, locale adaptions, ...)
        contents = String((0, modifiers_1.renderModifiers)(contents, true)); // true: Marking modifications as implicit
        // Integrate plug-in references into head element
        contents = (0, registry_1.integratePluginReferences)(contents, this.isCompound);
        // Inject suited base tag into head if is compound page
        this.isCompound
            && (contents = (0, markup_1.injectIntoHead)(contents, `<base href="${this.url.origin}${this.pathnameToConventional()}">`));
        // Integrate live functionality client script if envioronment is running in DEV MODE
        contents = (0, server_1.integrateLiveReference)(contents);
        return Buffer.from(contents, "utf-8");
    }
    /**
     * Close entity by performing a response with an individual message.
     * @param {Number} status Status code
     */
    respond(status) {
        // Set specific headers
        !config_server_1.default.allowFramedLoading
            && this.setHeader("X-Frame-Options", "SAMEORIGIN");
        // Search for related error page file if response is meant to be unsuccessful
        if (status.toString().charAt(0) != "2") { // TODO: Enhance routine
            // Traverse web file system for closest error page
            let curPathname = (0, path_1.join)((0, path_1.dirname)(this.url.pathname), String(status));
            while (curPathname !== "/") {
                // Look for conventional error page
                this.url.pathname = curPathname;
                if ((0, fs_1.existsSync)(this.localPath())) {
                    break;
                }
                // Look for compound error page otherwise
                this.url.pathname = this.pathnameToCompound();
                if ((0, fs_1.existsSync)(this.localPath())) {
                    this.isCompound = true;
                    this.compoundArgs = []; // No arguments as is to be generic (multi location re-routed)
                    break;
                }
                ;
                // Continue search in parent directory
                curPathname = (0, path_1.join)((0, path_1.dirname)((0, path_1.dirname)(curPathname)), String(status));
            }
            // Respond with error code (uses constructed error page pathname or generic message if not found)
            // Do not handle custom ResponseErrors for error pages due to endless recursion (generic 500)
            return super.respond(status, this.read());
        }
        // Perform definite response
        try {
            super.respond(status, this.read());
        }
        catch (err) {
            if (err instanceof ResponseError_1.ResponseError) {
                return this.respond(err.status);
            }
            throw err;
        }
    }
    process() {
        super.process();
        // Redirect URL default or extension explicit dynamic request to implicit equivalent
        if ((new RegExp(`(${config.dynamicFileDefaultName}(\\.${config.dynamicFileExtension})?|\\.${config.dynamicFileExtension})$`)).test(this.url.pathname)) {
            return this.redirect(this.url.pathname.replace(new RegExp(`(${config.dynamicFileDefaultName})?(\\.${config.dynamicFileExtension})?$`), ""));
        }
        // Enforce configured www strategy
        // TODO: Ignore on localhost (/ numerical)?
        if (config_server_1.default.www === "yes") {
            if (!this.subdomain[0] || this.subdomain[0] !== "www") {
                return this.redirect(this.url.pathname, `www.${this.url.hostname}`);
            }
        }
        else if (config_server_1.default.www === "no") {
            if (this.subdomain[0] && this.subdomain[0] === "www") {
                return this.redirect(this.url.pathname, this.url.hostname.replace(/^www\./, ""));
            }
        }
        // Enforce configured (default) locale strategy
        // Redirect only needed for dynamic files (web pages)
        // as static files can work with explicit request URLs too (reduces redirection overhead)
        if (this.locale) {
            // Redirect default URL implicit request to URL explicit variant if given (possibly partwise)
            const redirectPart = {
                language: (!this.locale.lang ? config_server_1.default.locale.languages.default : null),
                country: (!this.locale.country ? config_server_1.default.locale.countries.default : null)
            };
            if (redirectPart.language
                || redirectPart.country) {
                // Consider locale accept header if resquesting locale implicitly
                return this.redirect(`/${redirectPart.language || this.locale.lang}${(redirectPart.language && redirectPart.country) ? "-" : ""}${!this.locale.country ? `${redirectPart.country || this.locale.country}` : ""}${this.url.pathname}`);
            }
            // Code default locale for implicit processing if was given implicitly by URL
            this.locale.lang = this.locale.lang || config_server_1.default.locale.languages.default;
            this.locale.country = this.locale.country || config_server_1.default.locale.countries.default;
            // TODO: Unsupported locale behavior (404?)
        }
        // Append pathname with default file name if none explicitly given
        this.url.pathname = this.url.pathname.replace(/\/$/, `/${config.dynamicFileDefaultName}`);
        /*
         * Response strategy:
         * • Use conventional page on exact request location if exists.
         * • Use compound page (high-low nesting, bottom-up traversal, use (developing) appendix as args)
         * • Use error (will use next error page if exists)
         */
        // TODO: Implement sideeffect-less local path construction
        // Respond with file located at exactly requested path if exists
        if ((0, fs_1.existsSync)(this.localPath())) {
            return this.respond(200);
        }
        // Respond with closest related compound page if exists (bottom-up traversal)
        // Traverse a pathname to retrieve parameters of the closest compound page in the web file system
        const originalPathname = this.url.pathname; // Backup as of processing sideeffects
        // Traversal iteration limit (for preventing too deep nestings or endless traversal
        const traversalLimit = 100;
        // Traversal iterations counter
        let traversalCount = 0;
        // Intermediate compound arguments array
        const compoundArgs = [];
        // Traversal loop
        while (this.url.pathname !== "/") {
            this.url.pathname = this.pathnameToCompound();
            if ((0, fs_1.existsSync)(this.localPath())) {
                this.isCompound = true;
                this.compoundArgs = compoundArgs.reverse(); // Reverse (stacked) array to obtain URL order
                return this.respond(200);
            }
            // Construct next iteration
            compoundArgs.push((0, path_1.basename)(this.url.pathname));
            this.url.pathname = (0, path_1.dirname)((0, path_1.dirname)(this.url.pathname));
            traversalCount++;
            // Throw error upon reached iteration limit
            if (traversalCount >= traversalLimit) {
                // Close request due to processing timeout if traversal iteration limit reached
                return this.respond(408);
            }
        }
        this.url.pathname = originalPathname; // Use original pathname (strategy adjusted)
        // No suitable file found
        this.respond(404);
        // TODO: Store resolve mapping in order to reduce redunandant processing costs
    }
    getReducedRequestInfo() {
        return Object.assign(Object.assign(Object.assign({}, super.getReducedRequestInfo()), { pathname: decodeURIComponent(this.url.pathname), isCompound: this.isCompound }), (this.isCompound
            ? {
                base: this.pathnameToConventional(),
                args: this.compoundArgs
            }
            : {}));
    }
}
exports.DynamicGetEntity = DynamicGetEntity;
