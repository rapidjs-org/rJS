const devConfig = {
    "appNameLong": "rapidJS"
};


import { STATUS_CODES } from "http";
import { Socket } from "net";

import { IResponse, IHighlevelCookieOut } from "./interfaces";
import { THeaders, TResponseOverload } from "./types";
import { SPACE_CONFIG } from "./SPACE_CONFIG";


class DynamicResponse {

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

    public end(message: string|number|boolean|Buffer) {
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
    }

}


export function respond(socket: Socket, sResOverload: TResponseOverload, prioritizedHeaders?: THeaders): void {
    if(socket.writableEnded || socket.writableFinished) {
        return;
    }

    const dRes: DynamicResponse = new DynamicResponse(socket);
    const sRes: IResponse = (typeof sResOverload === "number")
    ? {
        status: sResOverload
    }
    : sResOverload;
    
    const contentLength: number = sRes.message
    ? ((sRes.message instanceof Buffer)
        ? Buffer.byteLength(sRes.message)
        : String(sRes.message).length)
    : 0;

    // TODO: Implement streams?

    // Default headers (overridable)
    dRes.setHeader("Server", devConfig.appNameLong);
    dRes.setHeader("X-XSS-Protection", "1; mode=block");

    // Apply high level headers
    for(const name in sRes.headers) {
        dRes.setHeader(name, sRes.headers[name]);
    }

    // Default headers (prioritized)
    dRes.setHeader("Cache-Control", SPACE_CONFIG.data.cache.client && `public, max-age=${SPACE_CONFIG.data.cache.client}, must-revalidate`);
	// dRes.setHeader("Strict-Transport-Security", runsSecure ? `max-age=${SPACE_CONFIG.data.cache.client}; includeSubDomains` : null); // TODO: How to infere TLS status?
	dRes.setHeader("Content-Length", String(contentLength));
    dRes.hasHeader("Content-Type")
    && dRes.setHeader("X-Content-Type-Options", "nosniff");
    for(const name in prioritizedHeaders) {
        dRes.setHeader(name, prioritizedHeaders[name]);
    }
    
    // Set cookie header
    for(const name in sRes.cookies) {
        const cookie: IHighlevelCookieOut = sRes.cookies[name];

	    dRes.setHeader("Set-Cookie", `${name}=${cookie.value}${
            cookie.maxAge ? `; Max-Age: ${cookie.maxAge}`: ""
        }${
            cookie.domain ? `; Domain: ${cookie.domain}`: ""
        }${
            cookie.path ? `; Path: ${cookie.path}`: ""
        }${
            cookie.sameSite ? `; Same-Site: ${cookie.sameSite}`: ""
        }${
            cookie.httpOnly ? "; HttpOnly" : ""
        }${
            ""// runsSecure ? "; Secure" : "" // TODO: TLS status (s.a.)?
        }`);
    }
    
    // TODO: Note that string messages are compressed
    dRes.statusCode = !SPACE_CONFIG.data.concealErrorStatus ? sRes.status : null;

    dRes.end(sRes.message);

    // TODO: Cache?
}