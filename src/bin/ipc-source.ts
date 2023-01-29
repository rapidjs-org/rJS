import { Socket, createConnection as createUnixSocketConnection } from "net";

import { IProxyIPCPackage } from "../_interfaces";
import { locateIPC } from "../ipc-locate";


export function sendIPC(command: string, port?: number, arg?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const client: Socket = createUnixSocketConnection(locateIPC(port));

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