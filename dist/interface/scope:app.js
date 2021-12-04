"use strict";
/**
 * Individual application scope interface object.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const wrapper_1 = require("./wrapper");
module.exports = Object.assign(Object.assign(Object.assign({}, require("./interface:shared")), require("./Environment")), { isDevMode: require("../utilities/is-dev-mode"), plugin: (0, wrapper_1.wrapInterface)(require("./plugin/register").bind, "connecting a plug-in", true), bindTemplating: (0, wrapper_1.wrapInterface)(require("../mods/templating").bind, "binding a templating handler", true) });
