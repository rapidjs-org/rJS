"use strict";
/**
 * File modification detection and propagation for live functionality.
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
exports.registerDetectionDir = void 0;
const config = {
    detectionFrequency: 1000
};
const fs_1 = require("fs");
const path_1 = require("path");
const config_server_1 = __importDefault(require("../config/config.server"));
const output = __importStar(require("../utilities/output"));
const server_1 = require("./server");
// Array of detection directories
const detectionDirs = [];
// Watch web file directory
registerDetectionDir(config_server_1.default.directory.web);
/**
 * Check whether a file has been modified within the last detection period
 * based on a given modification reference timestamp.
 * @param {number} time Modification reference timestamp
 * @returns {boolean} Whether has been modified
 */
function fileModified(time) {
    return (Math.abs(time - Date.now()) < config.detectionFrequency);
}
/**
 * Recursively scan a given directory for moification.
 * Modification to be effective if a file has been chnaged within
 * latest detection period.
 * @param {string} path Detection path (starting from root)
 * @param {Function} [callback] Function to call if modification has been detected
 */
async function scanDir(path, callback) {
    if (!(0, fs_1.existsSync)(path)) {
        // Directory does not exist
        return;
    }
    // Read current directory
    (0, fs_1.readdir)(path, {
        withFileTypes: true
    }, (_, dirents) => {
        dirents.forEach(dirent => {
            const curPath = (0, path_1.join)(path, dirent.name);
            if (dirent.isDirectory()) {
                // Scan sub directory
                return scanDir(curPath);
            }
            // Read file stats to check for modification status
            (0, fs_1.stat)(curPath, (_, stats) => {
                if (fileModified(stats.birthtime)
                    || fileModified(stats.mtimeMs)) {
                    // Change detected
                    callback && callback();
                    return (0, server_1.proposeRefresh)(); // Terminate current scanning process
                }
            });
        });
    });
}
/**
 * Register a directory for modification detection.
 * @param {string} directory Absolute path to directory
 */
function registerDetectionDir(directory) {
    detectionDirs.push(directory);
}
exports.registerDetectionDir = registerDetectionDir;
// Initialize detection interval
setInterval(_ => {
    try {
        // Scan directories registered for change detection
        detectionDirs.forEach(dir => {
            scanDir(dir);
        });
        // TODO: Plug-in files
        // TODO: Templating files
    }
    catch (err) {
        output.log("An error occurred scanning project files for modification in live mode");
        output.error(err);
    }
}, config.detectionFrequency);
