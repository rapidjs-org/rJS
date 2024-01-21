import { AHandler } from "./AHandler";
import { Request } from "./Request";


export class FileHandler extends AHandler {
    constructor(req: Request) {
        super(req);
    }

    public activate() {
        this.res.message = "Hello world!";
        
        this.res.setHeader("Content-Encoding", "UTF-8");
        this.res.setHeader("Content-Type", "text/html");

        this.respond();
    }
}