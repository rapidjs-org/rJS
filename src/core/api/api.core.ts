/**
 * Concrete server API as to be provided to application
 * interpreted within threads.
 */


import { IRuntimeMode } from "../../interfaces";

import { EmbedContext } from "../../EmbedContext";
import { Config } from "../Config";

import { Plugin } from "./Plugin";


Plugin.load();


export { Cache } from "./Cache";
export { VFS } from "./VFS";
export { Plugin } from "./Plugin";
export { ResponsePackage as Response } from "./ResponsePackage";


export const config: Config = Config.global;
export const mode: IRuntimeMode = EmbedContext.global.mode;