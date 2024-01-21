import { AHandler } from "./AHandler";
import { Request } from "./Request";


export class PluginHandler extends AHandler {
    constructor(req: Request) {
        super(req);
    }

    public activate() {

        this.respond();
    }
}