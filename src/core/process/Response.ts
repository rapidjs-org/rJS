import _config from "../_config.json";


import { STATUS_CODES } from "http";
import { Socket } from "net";

import { THeaders, TResponseOverload } from "../../_types";
import { IResponse, IHighlevelCookieOut } from "../../_interfaces";

import { Config } from "../Config";


/**
 * Class representing a comprehensively response writing
 * and closing a given socket.
 */
export class Response {

    private readonly headers: THeaders;

    constructor(socket: Socket, sResOverload: TResponseOverload, prioritizedHeaders?: THeaders) {
        if(socket.writableEnded || socket.writableFinished) {
            return;
        }
        
        // Store headers encoded with designated interface in order
        // to manipulate it from abstracting methods
        this.headers = {};

        // Retrieve a uniformal response object regardless of the
        // what response data has been overloaded
        const sRes: IResponse = (typeof sResOverload === "number")
        ? {
            status: sResOverload
        }
        : sResOverload;

        // Retrieve a uniformal response object regardless of the
        // what response data has been overloaded
        const contentLength: number = sRes.message
        ? String(sRes.message).length
        : 0;
        
        // Default headers (overridable)
        this.setHeader("Server", _config.appNameLong);
        this.setHeader("X-XSS-Protection", "1; mode=block");
        this.setHeader("Connection", "keep-alive");
        this.setHeader("Keep-Alive", "timeout=5");
        
        // Apply high level headers
        for(const name in sRes.headers) {
            this.setHeader(name, sRes.headers[name]);
        }
        
        // Default headers (prioritized)
        this.setHeader("Cache-Control", `public, max-age=${Config.global.get("cache", "client").number()}, must-revalidate`);
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

        // Write response data message
        const statusCode: number = !Config.global.get("concealErrorStatus").bool()
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
        data.push("", "");

        const resBuffer: Buffer = Buffer.concat([
            Buffer.from(data.join("\r\n"), "utf-8"),
            !Buffer.isBuffer(sRes.message) ? Buffer.from((sRes.message ?? "").toString()) : sRes.message,
            Buffer.from("\r\n")
        ]);

        socket.write(resBuffer);
        
        // Close socket connection
        socket.end(() => socket.destroy());
    }

    /**
     * Set a specific header for the response.
     * @param name Header name
     * @param value Header value
     */
    private setHeader(name: string, value: string|string[]) {
        this.headers[name] = value;
    }

    /**
     * Check whether a specific header for the response has
     * been set.
     * @param name Header name
     * @returns Whether the header is set
     */
    private hasHeader(name: string) {
        return !!this.headers[name];
    }
    
}