import { STATUS_CODES } from "http";
import { Socket } from "net";

import { THeaders, TResponseOverload } from "../../_types";
import { IResponse, IHighlevelCookieOut } from "../../_interfaces";


/**
 * Class representing a response writing and closing a
 * given socket comprehensively.
 */
export class Response {

    private readonly headers: THeaders;

    public statusCode: number;
    
    constructor(socket: Socket, sResOverload: TResponseOverload, prioritizedHeaders?: THeaders) {
        if(socket.writableEnded || socket.writableFinished) {
            return;
        }

        this.headers = {};

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
        
        // Default headers (overridable)
        this.setHeader("Server", _config.appNameLong);
        this.setHeader("X-XSS-Protection", "1; mode=block");
    
        // Apply high level headers
        for(const name in sRes.headers) {
            this.setHeader(name, sRes.headers[name]);
        }
    
        // Default headers (prioritized)
        this.setHeader("Cache-Control", CONFIG.data.cache.client && `public, max-age=${CONFIG.data.cache.client}, must-revalidate`);
        // this.setHeader("Strict-Transport-Security", runsSecure ? `max-age=${CONFIG.data.cache.client}; includeSubDomains` : null); // TODO: How to infere TLS status?
        this.setHeader("Content-Length", String(contentLength));
        this.hasHeader("Content-Type")
        && this.setHeader("X-Content-Type-Options", "nosniff");
        for(const name in prioritizedHeaders) {
            this.setHeader(name, prioritizedHeaders[name]);
        }
        
        // Set cookie header
        for(const name in sRes.cookies) {
            const cookie: IHighlevelCookieOut = sRes.cookies[name];
    
            this.setHeader("Set-Cookie", `${name}=${cookie.value}${
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
        const statusCode: number = !CONFIG.data.concealErrorStatus
        ? sRes.status
        : (sRes.message ? 200 : 400);
        
        const data: string[] = [];

        data.push(`HTTP/1.1 ${statusCode} ${STATUS_CODES[statusCode]}`);
        
        for(const name in this.headers) {
            const value: string = [ this.headers[name] ].flat().join(", ");

            if(!value) {
                continue;
            }

            data.push(`${name}: ${value}`);
        }

        data.push("");

        data.push(sRes.message.toString());

        socket.write(data.join("\r\n"));

        socket.end();
        socket.destroy();  // TODO: Reuse?
    }

    private setHeader(name: string, value: string|string[]) {
        this.headers[name] = value;
    }
    
    private hasHeader(name: string) {
        return !!this.headers[name];
    }
    
}