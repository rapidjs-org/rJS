import { join } from "path";
import { mkdirSync, rmSync } from "fs";
import { Socket, createServer, createConnection, Server } from "net";
import { EventEmitter } from "events";


type TIPCHandler<T> = (data: T) => void;

interface IIPCRequest<T> {
    command: string;
    data: T;
}

interface IIPCResponse<T> {
    error?: string;
    data?: T;
}


const isWin: boolean = process.platform === "win32";
const socketLocation: string = join(!isWin ? "/" : "\\\\.\\pipe\\", "tmp");


!socketLocation
&& mkdirSync(socketLocation, { recursive: true });


export class IPCServer extends EventEmitter {
	private static locateIPCFile(associatedPort: number): string {
		return join(socketLocation, `rjs__${associatedPort}.sock`);
	}

	public static message<I, O = void>(associatedPort: number, command: string, data?: I): Promise<O> {
		return new Promise((resolve, reject) => {
			const client: Socket = createConnection(IPCServer.locateIPCFile(associatedPort));
            
			const proxyIPCPackage: IIPCRequest<I> = {
				command, data
			};

			client.on("data", (message: Buffer) => {
				const response = JSON.parse(message.toString()) as IIPCResponse<O>;

				response.error
				? reject(response.error)
				: resolve(response.data);
                
				client.end();
			});
			client.on("error", (err: Error) => {
				reject();
                
				client.end();

				console.error(err);
			});
			client.write(JSON.stringify(proxyIPCPackage));
		});
	}

	private readonly associatedPort: number;
	private readonly server: Server;
	private readonly handlerRegistry: Map<string, TIPCHandler<unknown>> = new Map();
    
	constructor(associatedPort: number) {
		super();

		this.destroy();	// Clean up socket location
		
		this.associatedPort = associatedPort;

    	this.server = createServer((socket: Socket) => {
    		socket.on("data", async (message: Buffer) => {
    			const parsedMessage: IIPCRequest<unknown> = JSON.parse(message.toString());
				
				const handler: TIPCHandler<unknown>|undefined = this.handlerRegistry.get(parsedMessage.command);
				if(!handler) return;

				try {
					let data: unknown = handler(parsedMessage.data);
					data =  (data instanceof Promise)
					? (await data)
					: data;

					socket.write(JSON.stringify({ data } as IIPCResponse<unknown>));
				} catch(error: unknown) {
					socket.write(JSON.stringify({ error } as IIPCResponse<unknown>));
				} finally {
					socket.destroy();
				}
    		});
    	})
		.on("error", (err: Error) => this.emit("error", err));
		
		[
			"exit",
			"uncaughtException", "unhandledRejection",
			"SIGINT", "SIGUSR1", "SIGUSR2",
			"SIGTERM"
		].forEach((terminalEvent: string) => {
			process.on(terminalEvent, () => this.destroy());
		});
	}
	
	private destroy() {
		rmSync(IPCServer.locateIPCFile(this.associatedPort), {
			force: true
		});
	}

	public listen(listenCallback?: () => void): this {
		this.server
		.listen(IPCServer.locateIPCFile(this.associatedPort), listenCallback);
		
		return this;
	}

	public registerCommand<T>(command: string, handler: TIPCHandler<T>): this {
    	this.handlerRegistry.set(command, handler as TIPCHandler<unknown>);
        
		return this;
	}
}