import { Socket, createConnection as createUnixSocketConnection } from "net";

import { locateSocket } from "./proxy/locate-socket";


export function proxyIPC(command: string, port?: number, arg?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const client: Socket = createUnixSocketConnection(locateSocket(port));
        
        client.write(JSON.stringify({
            command, arg
        }));
        
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