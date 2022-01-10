"use strict";
/**
 * Retrieve whether the environment has been started in DEV MODE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const args_1 = require("../args");
exports.default = (0, args_1.argument)("dev")
    ? true
    : false;
