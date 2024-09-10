import { join } from "path";
import { EventEmitter } from "events";
import { Socket } from "net";

import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";

import { ICoreOptions, Core } from "@rapidjs.org/rjs-core";
import { Cluster } from "@rapidjs.org/rjs-cluster";


export class Scope extends EventEmitter {
	public readonly options: ICoreOptions;
	private readonly cluster: Cluster;

	constructor(options: Partial<ICoreOptions> = {}) {
		super();

		this.options = Core.optionsWithDefaults(options);
		
		this.cluster = new Cluster({	// TODO: Cluster type option
			modulePath: join(__dirname, "adapter"),
			options
		}, {
			baseSize: this.options.dev ? 1 : undefined,
			logsDirPath: this.options.cwd
		})
		.once("online", () => this.emit("online"));
	}	
	
	public async handleRequest(sReq: ISerialRequest, socket?: Socket): Promise<ISerialResponse> {	// TODO: IncomingMessage object overload?
		return this.cluster.handleRequest(sReq as ISerialRequest, socket);
	}

	public destroy() {
		this.cluster.destroy();
	}
}