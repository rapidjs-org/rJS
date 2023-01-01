import devConfig from "../dev-config.json";


import { Socket, createConnection as createUnixSocketConnection } from "net";


export function connectProxySocket(port: number, command: string) {
    return new Promise((resolve, reject) => {
        const client: Socket = createUnixSocketConnection(`${devConfig.socketNamePrefix}${port}.sock`);

        client.write(command);

        client.on("data", (message: Buffer) => {
            resolve(message.toString());

            client.end();
        });
        client.on("error", (error: Buffer) => {
            reject(error.toString());
            
            client.end();
        });
    });
}