"use strict";
/**
 * @class
 * Class representing a POST request specific entitiy.
 * To be exclusively used for plug-in channel maintenance.
 *
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostEntity = void 0;
const output = __importStar(require("../../utilities/output"));
const config_server_1 = __importDefault(require("../../config/config.server"));
const ResponseError_1 = require("../../interface/ResponseError/ResponseError");
const endpoint_1 = require("../../interface/plugin/endpoint");
const Entity_1 = require("./Entity");
class PostEntity extends Entity_1.Entity {
    /**
      * Create entity object based on web server induced request/response objects.
      * @param {IncomingMessage} req Request object
      * @param {ServerResponse} res Response object
      */
    constructor(req, res) {
        super(req, res);
    }
    process() {
        let blockBodyProcessing = false;
        const body = [];
        this.req.on("data", chunk => {
            if (blockBodyProcessing) {
                // Ignore further processing as maximum payload has been exceeded
                return;
            }
            body.push(chunk);
            if ((body.length * 8) <= config_server_1.default.limit.payloadSize) {
                // Continue on body stream as payload limit not yet reached
                return;
            }
            // Abort processing as bdy payload exceeds maximum size
            // Limit to be optionally set in server configuration file
            this.respond(413);
            blockBodyProcessing = true;
        });
        this.req.on("end", () => {
            if (blockBodyProcessing) {
                // Ignore further processing as maximum payload has been exceeded
            }
            // Parse payload
            let payload;
            try {
                payload = (body.length > 0) ? JSON.parse(body.toString()) : null;
            }
            catch (err) {
                throw new SyntaxError(`Error parsing endpoint request body '${this.url.pathname}'`);
            }
            if (!(0, endpoint_1.has)(payload.pluginName)
                || !(0, endpoint_1.has)(payload.pluginName, payload.endpointName)) {
                // No related endpoint found
                return this.respond(404);
            }
            super.process();
            try {
                try {
                    const data = (0, endpoint_1.use)(payload.pluginName, payload.body, payload.endpointName);
                    this.respond(200, data);
                }
                catch (err) {
                    if (err instanceof ResponseError_1.ResponseError) {
                        return this.respond(err.status, Buffer.from(err.message, "utf-8"));
                    }
                    throw err;
                }
            }
            catch (err) {
                output.error(err);
                this.respond(err.status, err.message);
            }
        });
        this.req.on("error", err => {
            throw err;
        });
    }
    getReducedRequestInfo() {
        return Object.assign(Object.assign({}, super.getReducedRequestInfo()), { isCompound: false // TODO: Set
         });
    }
}
exports.PostEntity = PostEntity;
