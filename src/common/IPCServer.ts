import { join } from "path";
import { Dirent, mkdirSync, readdirSync, rmSync } from "fs";
import { Socket, createServer, createConnection } from "net";
import { EventClassHandler } from "./EventClassHandler";
import { Util } from "./Util";

const _config = {
    "socketNamePrefix": "rjs.proxy."
};


type TCommandHandler = (commandParam?: unknown) => unknown;


interface IPCRequest {
    command: string;
    commandParam: unknown;
}

interface IPCResponse {
    data?: unknown;
    error?: unknown;
}


const SOCKET_LOCATION_PREFIX: string = Util.isUnixBasedOS ? "/tmp/" : "\\\\.\\pipe\\";

Util.isUnixBasedOS && mkdirSync(SOCKET_LOCATION_PREFIX, { recursive: true });


export class IPCServer {
	private static locateIPCFile(associatedPort: number): string {
		return join(SOCKET_LOCATION_PREFIX, `${_config.socketNamePrefix}${associatedPort}.sock`);
	}
	
	private static removeSocketFile(associatedPort: number) {
		const socketLocation: string = IPCServer.locateIPCFile(associatedPort);

		rmSync(socketLocation, {
			force: true
		});
	}

	public static clean(associatedPort: number) {
		rmSync(IPCServer.locateIPCFile(associatedPort));
	}

	public static associatedPorts(): number[] {
		return readdirSync(SOCKET_LOCATION_PREFIX, { withFileTypes: true })
		.filter((dirent: Dirent) => dirent.isSocket())
		.filter((dirent: Dirent) => new RegExp(`^${_config.socketNamePrefix.replace(/\./g, "\\.")}[0-9]+\\.sock$`).test(dirent.name))
		.map((dirent: Dirent) => parseInt(dirent.name.match(/[0-9]+/)[0]));
	}

	public static message(associatedPort: number, command: string, commandParam?: unknown): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const client: Socket = createConnection(IPCServer.locateIPCFile(associatedPort));
            
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

    private readonly commandRegistry: Map<string, TCommandHandler> = new Map();

    constructor(associatedPort: number, listensCallback?: (() => void), errorCallback: (err: Error) => void = (() => {})) {
    	IPCServer.removeSocketFile(associatedPort);

    	const socketLocation: string = IPCServer.locateIPCFile(associatedPort);

    	const server = createServer((socket: Socket) => {
    		socket.on("data", async (message: Buffer) => {
    			const parsedMessage: IPCRequest = JSON.parse(message.toString());

				const commandHandler: TCommandHandler = this.commandRegistry.get(parsedMessage.command);
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
        
		EventClassHandler.register(() => {
    		server.close();
			
    		IPCServer.removeSocketFile(associatedPort);
    	});
    }

    public registerCommand(command: string, handler: TCommandHandler): this {
    	this.commandRegistry.set(command, handler);

		return this;
    }
}