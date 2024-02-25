import { AHandler } from "./AHandler";
import { Request } from "./Request";


export class PluginHandler extends AHandler {
	constructor(req: Request) {
		super(req);
	}

	public activate() {
		// TODO: Catch error status
		this.respond();
	}
}