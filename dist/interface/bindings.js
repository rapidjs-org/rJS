"use strict";
/**
 * Handler or data binding storage.
 * To be defined using a respective interface.
 * Read by a processing function unit.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginRegistry = exports.templatingEngines = void 0;
/**
 * List (array) of templating engines to be applied in order of registration.
 * Represented by callbacks getting passed the response data string to be modified,
 * the evaluated related handler module export object and the current (reduced) request object.
 */
exports.templatingEngines = [];
/**
 * List (array) of registered plug-in related data.
 * Integrated into the enviornment upon registration.
 * Binding storage to be utilized for organizational management.
 */
exports.pluginRegistry = new Map();
