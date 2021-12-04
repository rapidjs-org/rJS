"use strict";
/**
 * @class
 * @abstract (augmented)
 * Class representing a GET request specific entitiy.
 * To be exclusively used for inhertance in asset retrieval entities.
 *
 * See: StaticGetEntity.js, DynamicGetEntity.js
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetEntity = void 0;
const fs_1 = require("fs");
const gzip_1 = require("gzip");
const config_server_1 = __importDefault(require("../../config/config.server"));
const config_mimes_1 = __importDefault(require("../../config/config.mimes"));
const UrlCache_1 = require("../support/cache/UrlCache");
const Entity_1 = require("./Entity");
class GetEntity extends Entity_1.Entity {
    /**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
    constructor(req, res) {
        super(req, res);
    }
    /**
     * Read the asset (file) implicitly linked to the request.
     * Use the cached value if a respecitvely valid entry exists.
     * @returns {Buffer|null} Asset (file) contents marking the foundation of the response message (idnetically if static)
     */
    read() {
        const localPath = this.localPath();
        if (GetEntity.cache.exists(localPath)) {
            return GetEntity.cache.read(localPath);
        }
        // Read file contents if file exists (use null otherwise)
        const contents = (0, fs_1.existsSync)(localPath) ? (0, fs_1.readFileSync)(localPath) : null;
        // Write contents to cache
        GetEntity.cache.write(this.localPath(), contents);
        return contents;
    }
    /**
     * Performe a response with an individual message.
     * @param {number} status Status code
     * @param {Buffer} [message] Response message
     */
    respond(status, message) {
        // Set MIME type header accordingly
        const mime = config_mimes_1.default[this.extension];
        if (mime) {
            this.setHeader("Content-Type", message ? mime : "text/plain");
            this.setHeader("X-Content-Type-Options", "nosniff");
        }
        // Apply GZIP compression and set related header if accepted by the client
        if (message
            && /(^|[, ])gzip($|[ ,])/.test(this.getHeader("Accept-Endcoding") || "")
            && config_server_1.default.gzipCompressList.includes(this.extension)) {
            // Set header
            this.setHeader("Content-Encoding", "gzip");
            // Compress
            message = (0, gzip_1.gzipSync)(message);
        }
        // Perform definite response
        super.respond(status, message);
    }
}
exports.GetEntity = GetEntity;
GetEntity.cache = new UrlCache_1.UrlCache();
