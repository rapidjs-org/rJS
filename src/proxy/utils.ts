/**
 * Module containing proxy context utility functions for
 * supporting reuse in related, but arbitrary (sub-)contexts.
 */


import _config from "../_config.json";


import { join } from "path";


/**
 * Locate the proxy related UNIX socket file name as to be
 * addressed both for sending and receiving proxy related
 * information across processes.
 * @param port Proxied port
 * @returns Socket file path
 */
export function locateProxySocket(port: number): string {
    return join(_config.socketDir, `${_config.socketNamePrefix}${port}.sock`);
}