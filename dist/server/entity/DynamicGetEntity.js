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
const config = Object.assign(Object.assign({}, require("../config.json")), { dynamicCachingDuration: 1000 // TODO: Make configurable? Or use same as for static (mods apply separately)?
 });
const fs_1 = require("fs");
const path_1 = require("path");
const config_server_1 = __importDefault(require("../../config/config.server"));
const ClientError_1 = require("../../interface/ClientError");
const modifiers_1 = require("../../mods/modifiers");
const registry_1 = require("../../interface/plugin/registry");
const server_1 = require("../../live/server");
const GetEntity_1 = require("./GetEntity");
// TODO: 404 fs map
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
        // Find related error file if response is meant to be unsuccessful
        // TODO: Improve routine / flow
        if (status.toString().charAt(0) != "2") {
            do {
                this.url.pathname = (0, path_1.join)((0, path_1.dirname)(this.url.pathname), `${status}.${config.dynamicFileExtension}`);
            } while (!(0, fs_1.existsSync)(this.localPath()) && this.url.pathname.length > 0);
        }
        // Perform definite response
        try {
            super.respond(status, this.read());
        }
        catch (err) {
            // TODO: Implement endless recursion handling (500, log)?
            if (err instanceof ClientError_1.ClientError) {
                return this.respond(err.status);
            }
            throw err;
        }
    }
    process() {
        // Respond with file located at exactly requested path if exists
        if ((0, fs_1.existsSync)(this.localPath())) {
            return this.respond(200);
        }
        // Find conventional file at path or respective compound page otherwise
        this.url.pathname = (0, path_1.join)((0, path_1.dirname)(this.url.pathname), (0, path_1.basename)(this.url.pathname).replace(/\.[a-z0-9]+$/i, ""), (0, path_1.basename)(this.url.pathname));
        if ((0, fs_1.existsSync)(this.localPath())) {
            this.isCompound = true;
            return this.respond(200);
        }
        // No suitable file found
        this.respond(404);
        // TODO: Store resolve mapping in order to reduce redunandant processing costs
    }
    getReducedRequestInfo() {
        const obj = super.getReducedRequestInfo();
        return Object.assign(Object.assign({}, obj), { pathname: this.isCompound ? (0, path_1.dirname)(this.url.pathname) : this.url.pathname, isCompound: this.isCompound });
    }
}
exports.DynamicGetEntity = DynamicGetEntity;
