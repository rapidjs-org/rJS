import _config from "../_config.json";


import { STATUS_CODES } from "http";
import { Socket } from "net";

import { THeaders, TResponseOverload } from "../../types";
import { IResponse, IHighlevelCookie } from "../../interfaces";
import { Config } from "../Config";


/**
 * Class representing a comprehensively response writing
 * and closing a given socket.
 */
export class Response {

    private static readonly staticHeaders = Config.global.get("headers").object() as THeaders;

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
        
        // Static headers (overridable)
        for(const name in Response.staticHeaders) {
            this.headers[name] = Response.staticHeaders[name];
        }

        // Apply high level headers
        for(const name in sRes.headers) {
            this.headers[name] , sRes.headers[name];
        }
        
        // Default headers (prioritized)
        this.headers["Cache-Control"] = `public, max-age=${Config.global.get("cache", "client").number()}, must-revalidate`;
        // this.headers["Strict-Transport-Security"] = runsSecure ? `max-age=${CONFIG.data.cache.client}; includeSubDomains` : null; // TODO: How to infere TLS status?
        this.headers["Content-Length"] = String(contentLength);
        !!this.headers["Content-Type"]
        && (this.headers["X-Content-Type-Options"] = "nosniff");

        for(const name in prioritizedHeaders) {
            this.headers[name] = prioritizedHeaders[name];
        }
        
        // Set cookie header
        for(const name in sRes.cookies) {
            const cookie: IHighlevelCookie = sRes.cookies[name];
            
            this.headers["Set-Cookie"] = `${name}=${cookie.value}${
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
            }`;
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
            !Buffer.isBuffer(sRes.message) ? Buffer.from((String(sRes.message ?? ""))) : sRes.message,
            Buffer.from("\r\n")
        ]);

        socket.write(resBuffer);
        
        // Close socket connection
        socket.end(() => socket.destroy());
    }

}