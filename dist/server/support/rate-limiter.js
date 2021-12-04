"use strict";
/**
 * Rate limiting to be utilized upon each request.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateExceeded = void 0;
// Parameter
const config_server_1 = __importDefault(require("../../config/config.server"));
const periodLength = 60000;
// Object
const limiter = {
    windowStart: 0,
    previous: null,
    current: null
};
// TODO: Enhance strategy (reduce throughput)?
/**
 * Update limiter window.
 * @returns {number} Current window weight
 */
function updateWindow() {
    const now = Date.now();
    let timeIn = Math.abs(limiter.windowStart - now);
    if (timeIn >= periodLength) {
        limiter.previous = (timeIn >= (2 * periodLength)) ? {} : (limiter.current || {});
        limiter.current = {};
        timeIn = timeIn % periodLength;
        limiter.windowStart = now - timeIn;
    }
    return (timeIn / periodLength);
}
/**
 * Check whether to block the request by the rate limiter.
 * @param {string} ip - IP address of request's remote connection
 * @return {boolean} - Whether the request must be blocked due to 429 (Too many requests)
 */
function rateExceeded(ip) {
    if (!config_server_1.default.maxRequestsPerMin) {
        return false;
    }
    const curWindowWeight = updateWindow();
    const slideSum = Math.floor((curWindowWeight * (limiter.current[ip] || 0))
        + ((1 - curWindowWeight) * (limiter.previous[ip] || 0)));
    if (slideSum >= config_server_1.default.maxRequestsPerMin) {
        // Deny request
        return true;
    }
    limiter.current[ip] = isNaN(limiter.current[ip])
        ? 0
        : ++limiter.current[ip];
    // Allow request
    return false;
}
exports.rateExceeded = rateExceeded;
