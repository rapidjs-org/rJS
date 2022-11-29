const devConfig = {
    "appNameLong": "rapidJS"
};


import { ServerResponse } from "http";

import { IResponse, IHighlevelCookieOut } from "./interfaces";
import { THeaders, TResponseOverload } from "./types";
import { SPACE_CONFIG } from "./SPACE_CONFIG";


export function respond(dRes: ServerResponse, sResOverload: TResponseOverload, prioritizedHeaders?: THeaders): void {
    if(dRes.writableEnded || dRes.writableFinished) {
        return;
    }
        
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
	dRes.setHeader("X-Powered-By", null);

    // Apply high level headers
    for(const name in sRes.headers) {
        dRes.setHeader(name, sRes.headers[name]);
    }
    
    // Default headers (prioritized)
    dRes.setHeader("Cache-Control", SPACE_CONFIG.data.cache.client ? `public, max-age=${SPACE_CONFIG.data.cache.client}, must-revalidate` : null);
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
    dRes.statusCode = !SPACE_CONFIG.data.concealErrorStatus
    ? sRes.status : 400;

    dRes.end(sRes.message);

    // TODO: Cache?
}