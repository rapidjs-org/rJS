/**
 * Module containing sub-dependent utility functions for
 * supporting reuse in related, but arbitrary (sub-)contexts.
 */


import _config from "./_config.json";


import { join } from "path";
import { Socket, createConnection as createUnixSocketConnection } from "net";

import { IProxyIPCPackage } from "../_interfaces";

import { EmbedContext } from "./EmbedContext";


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

/**
 * Message the context related proxy application by sending it
 * to the respective UNIX socket. The socket location is inherent
 * to the current runtime context as provided by the present
 * argument set.
 * @param port Portmto which the addressed proxy is bound
 * @param command Command to expect the proxy application to execute
 * @param arg Argument supplementory to command
 * @returns Promise resolving to the buffered proxy response message
 */
export function messageProxy(port: number, command: string, arg?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const client: Socket = createUnixSocketConnection(locateProxySocket(port));
        
        const proxyIPCPackage: IProxyIPCPackage = {
            command, arg
        };
        
        client.write(JSON.stringify(proxyIPCPackage));
        
        client.on("data", (message: Buffer) => {
            resolve(JSON.parse(message.toString()));
            
            client.end();
        });

        client.on("error", (error: Buffer) => {
            // console.error(error.toString());
            
            reject(new Error(error.toString()));
            
            client.end();
        });
    });
}

/**
 * Log streamlined global hostname configuration.
 * e.g.: { example.com, example.net, localhost } → example.com(+2)
 */ 
export function captionEffectiveHostnames(): string {
    return `${
        EmbedContext.global.hostnames[0]
    }${(
        EmbedContext.global.hostnames.length > 1)
        ? ` (+${EmbedContext.global.hostnames.length - 1})`
        : ""
    }`;
}