"use strict";
/**
 * Web file system interface.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exists = exports.read = void 0;
const config_json_1 = __importDefault(require("../config.json"));
const fs_1 = require("fs");
const path_1 = require("path");
const config_server_1 = __importDefault(require("../config/config.server"));
const normalize_1 = require("../utilities/normalize");
const modifiers_1 = require("../mods/modifiers");
// TODO: Bind file reader interface?
/**
 * Read a file from the web directory file system.
 * @param {string} pathname Path to file (relative to web directory root)
 * @returns {Buffer} File contents
 * @throws ClientError (404) if file does not exist
 */
function read(pathname) {
    // Construct absolute path on local disc
    const localPath = (0, path_1.join)(config_server_1.default.directory.web, pathname);
    let contents = String((0, fs_1.readFileSync)(localPath));
    // Apply registered file modifiers if is dynamic file request
    contents = ((0, normalize_1.normalizeExtension)((0, path_1.extname)(pathname)) === config_json_1.default.dynamicFileExtension)
        ? (0, modifiers_1.renderModifiers)(contents)
        : contents;
    return Buffer.from(contents, "utf-8");
}
exports.read = read;
/**
 * Check whether a file exists at a given path in the web directory file system.
 * @param {string} pathname Path to file (relative to web directory root)
 * @returns {boolean} Whether file exists
 */
function exists(pathname) {
    return (0, fs_1.existsSync)((0, path_1.join)(config_server_1.default.directory.web, pathname)) ? true : false;
}
exports.exists = exists;
