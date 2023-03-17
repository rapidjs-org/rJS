/**
 * Concrete server API as to be provided to application
 * interpreted within threads.
 */


import { EmbedContext } from "../../proxy/EmbedContext";


export { Config } from "../Config";

export { Plugin } from "./Plugin";
export { Cache } from "./Cache";
export { VFS } from "./VFS";
export { ResponsePackage as Response } from "./ResponsePackage";


export const mode = EmbedContext.global.mode;