"use strict";
/**
 * File modification detection and propagation for live functionality.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    detectionFrequency: 1000
};
const fs_1 = require("fs");
const path_1 = require("path");
const web_path_1 = __importDefault(require("../utilities/web-path"));
const server_1 = require("./server");
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
 * @param {string} path Detection root path
 * @param {Function} [callback] Function to call if modification has been detected
 */
function scanDir(path, callback) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
// Initialize detection interval
setInterval(_ => {
    // Scan web files directory
    scanDir(web_path_1.default);
    // TODO: Plug-in files
    // TODO: Templating files
}, config.detectionFrequency);
