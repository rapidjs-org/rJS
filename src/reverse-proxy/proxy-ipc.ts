import devConfig from "../_config.json";


import { Socket, createConnection as createUnixSocketConnection } from "net";


export function proxyIPC(port: number, command: string, arg?: unknown): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const client: Socket = createUnixSocketConnection(`${devConfig.socketNamePrefix}${port}.sock`);
        
        client.write(JSON.stringify({
            command, arg
        }));

        client.on("data", (message: Buffer) => {
            resolve(message.toString() === "1");
            
            client.end();
        });
        client.on("error", (error: Buffer) => {
            // console.error(error.toString());
            
            reject(new Error(error.toString()));
            
            client.end();
        });
    });
}