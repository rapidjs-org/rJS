import _config from "./_config.json";


import { Socket, createConnection, createServer } from "net";
import { rmSync } from "fs";
import { join } from "path";


type TCommandHandler = (data: unknown) => unknown;

interface IProxyIPCPackage {
    command: string;
    arg: unknown;
}


export class UnixServer {
    
	private static locateProxySocket(associatedPort: number): string {
		return join(_config.socketDir, `${_config.socketNamePrefix}${associatedPort}.sock`);
	}

	private static removeSocketFile(associatedPort: number) {
		const socketLocation: string = UnixServer.locateProxySocket(associatedPort);

		rmSync(socketLocation, {
			force: true
		});
	}

	public static message(associatedPort: number, command: string, arg?: unknown): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const client: Socket = createConnection(UnixServer.locateProxySocket(associatedPort));
            
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

    private readonly commandRegistry: Map<string, TCommandHandler> = new Map();

    constructor(associatedPort: number, listensCallback?: () => void, errorCallback?: (err: { code: string }) => void) {
    	UnixServer.removeSocketFile(associatedPort);

    	const socketLocation: string = UnixServer.locateProxySocket(associatedPort);

    	const server = createServer((socket: Socket) => {
    		socket.on("data", (message: Buffer) => {
    			const data: IProxyIPCPackage = JSON.parse(message.toString());

    			const response: unknown = (this.commandRegistry.get(data.command) ?? (() => null))(data.arg);
                
    			socket.write(JSON.stringify(response ?? false));
                
    			socket.destroy();
    		});
    	})
    	.listen(socketLocation, listensCallback);

    	server.on("error", (err: { code: string }) => {
    		errorCallback
            && errorCallback(err);

    		console.error(`HTTP/TCP server startup error: ${err.code}`);
    	});
        
    	const cleanUpUnixSockets = (code: number) => {
    		server.close();

    		UnixServer.removeSocketFile(associatedPort);
            
    		process.exit(code);
    	};

    	process.on("SIGINT", cleanUpUnixSockets);
    	process.on("SIGTERM", cleanUpUnixSockets);
    	process.on("exit", cleanUpUnixSockets);
    }

    public registerCommand(command: string, handler: TCommandHandler) {
    	this.commandRegistry.set(command, handler);
    }

}