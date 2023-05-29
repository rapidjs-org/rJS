/**
 * Concrete server API as to be provided to application
 * interpreted within threads.
 */


import { EmbedContext } from "../EmbedContext";
import { Config } from "../Config";


export type TConcreteAppAPI = typeof import("./api.concrete");


export { Plugin } from "./Plugin";
export { Cache } from "./Cache";
export { VFS } from "./VFS";
export { ResponsePackage as Response } from "./ResponsePackage";


export const config = Config.global;
export const mode = EmbedContext.global.mode;