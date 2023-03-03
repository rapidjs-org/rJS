import { rmSync } from "fs";
import { Socket, createServer as createUnixSocketServer } from "net";

import { IProxyIPCPackage } from "../_interfaces";

import { locateProxySocket } from "./utils";


export function create(port: number, handleCallback: (command: string, arg?: unknown) => void, listenCallback?: () => void) {
    const socketLocation: string = locateProxySocket(port);
    
    rmSync(socketLocation, {
        force: true
    });

    const unixSocketServer = createUnixSocketServer((socket: Socket) => {
        socket.on("data", (message: Buffer) => {
            const data: IProxyIPCPackage = JSON.parse(message.toString());

            const response: unknown = handleCallback(data.command, data.arg);
            
            socket.write(JSON.stringify(response ?? false));

            socket.destroy();
        });
    })
    .listen(socketLocation, listenCallback);
    
    const cleanUpUnixSockets = (code: number) => {
        unixSocketServer.close();
                
        process.exit(code);
    };

    process.on("SIGINT", cleanUpUnixSockets);
    process.on("SIGTERM", cleanUpUnixSockets);
    process.on("exit", cleanUpUnixSockets);
}