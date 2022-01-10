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
exports.StaticGetEntity = void 0;
const config_server_1 = __importDefault(require("../../config/config.server"));
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const registry_1 = require("../../interface/plugin/registry");
const normalize_1 = require("../../utilities/normalize");
const is_dev_mode_1 = __importDefault(require("../../utilities/is-dev-mode"));
const GetEntity_1 = require("./GetEntity");
class StaticGetEntity extends GetEntity_1.GetEntity {
    /**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
    constructor(req, res) {
        super(req, res);
        this.extension = (0, normalize_1.normalizeExtension)((0, path_1.extname)(this.url.pathname));
    }
    /**
     * Close entity by performing a response with an individual message.
     * @param {number} status Status code
     * @param {Buffer} [message] Response message
     */
    respond(status, message) {
        // Set cache control headers
        (!is_dev_mode_1.default && config_server_1.default.cachingDuration.client)
            && this.setHeader("Cache-Control", `public, max-age=${config_server_1.default.cachingDuration.client}, must-revalidate`);
        // Perform definite response
        super.respond(status, message);
    }
    process() {
        super.process();
        // Custom plufg-in client module file request handling
        if ((0, registry_1.isClientModuleRequest)(this.url.pathname)) {
            this.extension = "js";
            return super.respond(200, (0, registry_1.retrieveClientModules)(this.url.pathname));
        }
        if (!(0, fs_1.existsSync)(this.localPath())) {
            // No respective file found
            return this.respond(404);
        }
        if (is_dev_mode_1.default) {
            // No ETag in DEV MODE (always reload)
            return this.respond(200, super.read());
        }
        // Generate and set ETag (header)
        // Construct ETag from md5 hashed dash separated modification relevant file stats
        const fileDescriptor = (0, fs_1.openSync)(this.localPath(), "r");
        const { ino, size, mtimeMs } = (0, fs_1.fstatSync)(fileDescriptor);
        let eTag = `${ino}-${size}-${mtimeMs}`;
        eTag = (0, crypto_1.createHash)("md5").update(eTag).digest("hex");
        this.setHeader("ETag", eTag);
        // Respond with cache activation status (ressource not modified)
        // if current version has already been served to client
        if (this.getHeader("If-None-Matched") == eTag) {
            super.respond(304);
        }
        this.respond(200, super.read());
    }
}
exports.StaticGetEntity = StaticGetEntity;
