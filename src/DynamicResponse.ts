import { STATUS_CODES } from "http";
import { Socket } from "net";

import { THeaders } from "./types";


export class DynamicResponse {

    private readonly socket: Socket;
    private readonly headers: THeaders;

    public statusCode: number;

    constructor(socket: Socket) {
        this.socket = socket;
        this.headers = {};
    }

    public setHeader(name: string, value: string|string[]) {
        this.headers[name] = value;
    }
    
    public hasHeader(name: string) {
        return !!this.headers[name];
    }

    public end(message?: string|number|boolean|Buffer) {
        this.statusCode = this.statusCode ?? (message ? 200 : 400);

        const data: string[] = [];

        data.push(`HTTP/1.1 ${this.statusCode ?? 400} ${STATUS_CODES[this.statusCode]}`);
        
        for(const name in this.headers) {
            const value: string = [ this.headers[name] ].flat().join(", ");

            if(!value) {
                continue;
            }

            data.push(`${name}: ${value}`);
        }

        data.push("");

        data.push(message?.toString());

        this.socket.write(data.join("\r\n"));

        this.socket.end();
        this.socket.destroy();  // TODO: Reuse?
    }

}