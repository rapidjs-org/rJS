"use strict";
/**
 * Web server instance activating HTTP method handlers and general
 * security guards and routines.
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
const config_json_1 = __importDefault(require("../config.json"));
const fs_1 = require("fs");
const path_1 = require("path");
const output = __importStar(require("../utilities/output"));
const is_dev_mode_1 = __importDefault(require("../utilities/is-dev-mode"));
const normalize_1 = require("../utilities/normalize");
const config_server_1 = __importDefault(require("../config/config.server"));
const rate_limiter_1 = require("./support/rate-limiter");
const registry_1 = require("../interface/plugin/registry");
const Entity_1 = require("./entity/Entity");
const StaticGetEntity_1 = require("./entity/StaticGetEntity");
const DynamicGetEntity_1 = require("./entity/DynamicGetEntity");
const PostEntity_1 = require("./entity/PostEntity");
const hook_1 = require("./hook");
const entityConstructor = {
    BASIC: Entity_1.Entity,
    GET: {
        STATIC: StaticGetEntity_1.StaticGetEntity,
        DYNAMIC: DynamicGetEntity_1.DynamicGetEntity
    },
    POST: PostEntity_1.PostEntity
};
// Retrieve server optional server parameter
const options = {};
if (config_server_1.default.ssl) { // TODO: How to treat for DEV MODE?
    const readCertFile = (pathname) => {
        // Construct application relative path if not given in absolute format
        pathname = (pathname.charAt(0) == "/") ? pathname : (0, path_1.join)((0, path_1.dirname)(require.main.filename), pathname);
        return (0, fs_1.readFileSync)(pathname);
    };
    options.cert = config_server_1.default.ssl.certFile ? readCertFile(config_server_1.default.ssl.certFile) : null;
    options.key = config_server_1.default.ssl.keyFile ? readCertFile(config_server_1.default.ssl.keyFile) : null;
    options.dhparam = config_server_1.default.ssl.dhParam ? readCertFile(config_server_1.default.ssl.dhParam) : null;
}
// Create effective web server instance (for HTTPS if defined, HTTP otherwise)
const protocol = config_server_1.default.port.https
    ? "https"
    : "http";
// Create main server
require(protocol)
    .createServer(options, (req, res) => {
    // Asynchronous request handler
    handleRequest(req, res).catch(err => {
        // Catch bubbling up unhandled errors for display and generic server error response
        output.error(err);
        (new entityConstructor.BASIC(null, res)).respond(500);
    });
})
    .listen(config_server_1.default.port[protocol], config_server_1.default.hostname, config_server_1.default.limit.requestsPending, () => {
    output.log(`Server started listening on port ${config_server_1.default.port[protocol]}`);
    is_dev_mode_1.default && output.log("Running DEV MODE");
});
// Create redirection server (HTTP to HTTPS) if effective protocol is HTTPS
config_server_1.default.port.https
    && (require("http")
        .createServer((req, res) => {
        (new entityConstructor.BASIC(null, res)).redirect(req.url);
    })
        .listen(config_server_1.default.port.http, config_server_1.default.hostname, config_server_1.default.limit.requestsPending, () => {
        // Use set up HTTP port for redirection (80 by default (recommended))
        output.log(`HTTP (:${config_server_1.default.port.http}) to HTTPS (:${config_server_1.default.port.https}) redirection enabled`);
    }));
/**
 * Handle a single request asynchronously.
 * @async
 * @param {IncomingMessage} req Request object
 * @param {ServerResponse} res Response object
 */
async function handleRequest(req, res) {
    // TODO: Enhance client module request processing?
    // Retrieve entity type first (or close response if can not be mapped accordingly)
    let entity;
    switch (req.method.toUpperCase()) {
        case "GET": {
            // (Initial) asset request
            const extension = (0, path_1.extname)(req.url);
            const normalizedExtension = extension ? (0, normalize_1.normalizeExtension)(extension) : config_json_1.default.dynamicFileExtension;
            // TODO: Static file external asset server redirect (permanent, for DYNAMIC exclusive servers), per option?
            entity = new entityConstructor.GET[(normalizedExtension == config_json_1.default.dynamicFileExtension
                && !(0, registry_1.isClientModuleRequest)(req.url))
                ? "DYNAMIC"
                : "STATIC"](req, res);
            break;
        }
        case "POST": {
            // Plug-in channel request
            entity = new entityConstructor.POST(req, res);
            break;
        }
        default: {
            // Block request as HTTP method is not supported
            return (new entityConstructor.BASIC(null, res)).respond(405);
        }
    }
    // Store hook to entity
    (0, hook_1.createHook)(entity);
    // Block request if URL is exceeding the maximum length
    if (config_server_1.default.limit.urlLength > 0
        && req.url.length > config_server_1.default.limit.urlLength) {
        return entity.respond(414);
    }
    // Block request if individual request maximum reached (rate limiting)
    if ((0, rate_limiter_1.rateExceeded)(req.connection.remoteAddress)) {
        entity.setHeader("Retry-After", 30000); // Retry after half the rate limiting period length
        return entity.respond(429);
    }
    // Call entity specific request processor method
    entity.process();
}
// TODO: Implement option for hiding status codes (reducing the set to {200, 404} for strategy security)
