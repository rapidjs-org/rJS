import { join } from "path";
import { Dirent, mkdirSync, readdirSync, rmSync } from "fs";
import { Socket, createServer, createConnection } from "net";
import { EventClassHandler } from "./EventClassHandler";
import { Util } from "./Util";

const _config = {
	"socketNamePrefix": "rjs.proxy."
};


const isWinOS: boolean = (process.platform === "win32");

const SOCKET_LOCATION_PREFIX: string = isWinOS ? "/tmp/" : "\\\\.\\pipe\\";

isWinOS
&& mkdirSync(SOCKET_LOCATION_PREFIX, { recursive: true });


type TEndpointCallback = (commandParam?: unknown) => unknown;


export interface IPCRequest {
    command: string;
    commandParam: unknown;
}

export interface IPCResponse {
    data?: unknown;
    error?: unknown;
}


export function locateIPCAddress(associatedPort: number): string {
	return join(SOCKET_LOCATION_PREFIX, `${_config.socketNamePrefix}${associatedPort}.sock`);
}


export class IPCServer {
	public static removeSocket(associatedPort: number) {
		rmSync(locateIPCAddress(associatedPort));
	}

	public static associatedPorts(): number[] {
		return readdirSync(SOCKET_LOCATION_PREFIX, { withFileTypes: true })
		.filter((dirent: Dirent) => dirent.isSocket())
		.filter((dirent: Dirent) => new RegExp(`^${_config.socketNamePrefix.replace(/\./g, "\\.")}[0-9]+\\.sock$`).test(dirent.name))
		.map((dirent: Dirent) => parseInt(dirent.name.match(/[0-9]+/)[0]));
	}

	public static message(associatedPort: number, command: string, commandParam?: unknown): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const client: Socket = createConnection(locateIPCAddress(associatedPort));
            
			const proxyIPCPackage: IPCRequest = {
				command, commandParam
			};
			
			client.write(JSON.stringify(proxyIPCPackage));
			
			client.on("data", (message: Buffer) => {
				const response: IPCResponse = JSON.parse(message.toString());

				response.error
					? reject(response.error)
					: resolve(response.data);
				
				client.end();
			});
			client.on("error", (err: Error) => {
				reject(err);
				
				client.end();
			});
		});
	}

	private readonly commandRegistry: Map<string, TEndpointCallback> = new Map();

	constructor(associatedPort: number, listensCallback?: (() => void), errorCallback: (err: Error) => void = (() => {})) {
    	IPCServer.removeSocket(associatedPort);

    	const socketLocation: string = locateIPCAddress(associatedPort);

    	const server = createServer((socket: Socket) => {
    		socket.on("data", async (message: Buffer) => {
    			const parsedMessage: IPCRequest = JSON.parse(message.toString());

				const commandHandler: TEndpointCallback = this.commandRegistry.get(parsedMessage.command);
				if(commandHandler) {
					let data, error;
					try {
						const response: unknown = commandHandler(parsedMessage.commandParam);
						data = await (!(response instanceof Promise)
							? Promise.resolve(response)
							: response);
					} catch(err: unknown) {
						error = err.toString();
					} finally {
						socket.write(JSON.stringify({
							data, error
						} as IPCResponse));

						socket.destroy();
					}
				}
    		});
    	})
    	.listen(socketLocation, listensCallback);

    	server.on("error", errorCallback);
        
		process.on("exit", () => {
    		server.close();
			
    		IPCServer.removeSocket(associatedPort);
    	}); // TODO: Also on other termination
	}

	public registerEndpoint(identifier: string, callback: TEndpointCallback): this {
    	this.commandRegistry.set(identifier, callback);
        
		return this;
	}
}