import { join } from "path";
import { Server, ServerOptions, RequestListener, IncomingMessage, ServerResponse, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { IHighlevelEncoding, IHighlevelLocale, IHighlevelURL, IRequest, ISpaceEnv, THighlevelCookieIn } from "../interfaces";
import { Config } from "../Config";
import { RateLimiter } from "./RateLimiter";
import { respond } from "../respond";
import * as print from "../print";

import { ChildProcessPool } from "./ProcessPool";


interface ISpace {
    childProcessPool: ChildProcessPool;
    config: Config;
    rateLimiter: RateLimiter<string>;
}

interface IAcceptHeaderPart {
    name: string;
    quality: number;
}


process.on("uncaughtException", (err: Error) => {
    console.error(err);

    // TODO: Handle
});


const embeddedSpaces: Map<string, ISpace> = new Map();
const commonServerOptions = {
    keepAlive: true // TODO: Optionalize?
};

const proxyConfig: {
    port?: number;
    runSecure?: boolean;
} = {};


// TODO: Pass down entirely???
async function handleSocketConnection(dReq: IncomingMessage, dRes: ServerResponse, hostname: string) {
    if(!embeddedSpaces.has(hostname)) {
        respond(dRes, 404);

        return;
    }

    const curSpace: ISpace = embeddedSpaces.get(hostname);

    const clientIP: string = dReq.headers["x-forwarded-for"]
    ? [ dReq.headers["x-forwarded-for"] ].flat()[0]
        .split(/,/g)
        .shift()
        .trim()
    : dReq.socket.remoteAddress;
    
    if(!curSpace.rateLimiter.grantsAccess(clientIP)) {
        respond(dRes, 429);

        return;
    }

    if(dReq.url.length > curSpace.config.data.limit.urlLength) {
        respond(dRes, 414);

        return;
    }
    
    const method: string = dReq.method.toUpperCase();

    let bodyString: string;
    if([ "POST", "PUT", "OPTIONS" ].includes(method)) {
        try {
            const bodyChunks: string[] = [];

            bodyString = await new Promise((resolve, reject) => {
                dReq.on("data", (chunk: string) => {
                    bodyChunks.push(chunk);
                });
                
                dReq.on("end", () => {
                    try {
                        resolve(bodyChunks.length ? bodyChunks.join("") : null);
                    } catch(err) {
                        reject(err);
                    }
                });
                
                dReq.on("error", err => {
                    reject(err);
                });
            });;
        } catch(err) {
            print.error(err);

            respond(dRes, 422);
            
            return;
        }
    }

    if(bodyString?.length >= curSpace.config.data.limit.payloadSize) {
        respond(dRes, 413);

        return;
    }

    const host: string = dReq.headers["host"]
    .replace(/^(https?:\/\/)?/, `http${proxyConfig.runSecure ? "s" : ""}://`)
    .replace(/(:[0-9]+)?$/, `:${proxyConfig.port}`);

    const dynamicURL: URL = new URL(!/^https?:\/\//.test(dReq.url)
    ? `${host}${dReq.url}`
    : dReq.url);
    const highlevelURL: IHighlevelURL = {
        hash: dynamicURL.hash,
        host: dynamicURL.host,
        hostname: dynamicURL.hostname,
        href: dynamicURL.href,
        origin: dynamicURL.origin,
        password: dynamicURL.password,
        pathname: dynamicURL.pathname,
        port: dynamicURL.port,
        protocol: dynamicURL.protocol,
        search: dynamicURL.search,
        username: dynamicURL.username,

        searchParams: Object.fromEntries(dynamicURL.searchParams.entries())
    };

    const highlevelLocale: IHighlevelLocale[] = parseAcceptHeader(dReq.headers["accept-language"])
    .map((locale: IAcceptHeaderPart) => {
        const parts: string[] = locale.name.match(/^([a-z]+|\*)(-([A-Z]+))?$/);
        
        if(!parts) {
            return null;
        }
        
        return {
            language: parts[1],
            quality: locale.quality,

            ... parts[3]
            ? {
                region: parts[3]
            }: {}
        };
    })
    .filter((locale: IHighlevelLocale) => locale);

    const highlevelEncoding: IHighlevelEncoding[] = parseAcceptHeader(dReq.headers["accept-encoding"])
    .map((encoding: IAcceptHeaderPart) => {
        return {
            type: encoding.name,
            quality: encoding.quality
        }
    });   // TODO: Streamline accept header parsed types ("quality header"?)

    const highlevelCookies: THighlevelCookieIn = {};
    (dReq.headers["cookie"] ?? "")
    .split(/;/g)
    .forEach((cookie: string) => {
        if(!/\s*[^;, ]+=.+\s*/.test(cookie)) {
            return;
        }

        const parts: string[] = cookie.split(/=/);
        let value: string|number|boolean;
        try {
            value = JSON.parse(parts[1]);
        } catch {
            value = parts[1];
        }

        highlevelCookies[parts[0].trim()] = value;
    });

    const sReq: IRequest = {
        method: method,
        url: highlevelURL,

        cookies: highlevelCookies,
        encoding: highlevelEncoding,
        locale: highlevelLocale,

        headers: dReq.headers,  // TODO: High-level headers interface?
        
        ...(bodyString ? {
            bodyString: bodyString
        } : {})
    };
    
    // Remove auto-processed headers from serialized high-level representation
    delete sReq.headers["host"];
    delete sReq.headers["accept-encoding"];
    delete sReq.headers["accept-language"];
    delete sReq.headers["cookie"];

    curSpace.childProcessPool
    .assign({
        sReq: sReq,
        socket: dRes.socket
    });
}

function parseAcceptHeader(header: string|string[]): IAcceptHeaderPart[] {
    return ([ header ].flat()[0] ?? "")
    .split(/,/g)
    .map((encoding: string) => encoding.trim())
    .filter((encoding: string) => encoding)
    .map((enconding: string) => {
        return {
            name: enconding.match(/^[^;]+/)[0],
            quality: parseFloat((enconding.match(/;q=([01](.[0-9]+)?)$/) || [ null, "1" ])[1])
        };
    })
    .sort((a, b) => (b.quality - a.quality)) as IAcceptHeaderPart[]
    ?? null;
};


// TODO: Limiters here?
export function bootReverseProxyServer(port: number, runSecure: boolean) {
    if(proxyConfig.port) {
        throw new RangeError("Non-singleton usage of proxy server within a single proxy process");
    }

    proxyConfig.port = port;
    proxyConfig.runSecure = runSecure;

    const createServer: (options: ServerOptions, requestListener?: RequestListener) => Server
    = runSecure
    ? createHTTPSServer
    : createHTTPServer;

    createServer({
        ...commonServerOptions,

        ...(runSecure ? {} : {}),  // TODO: TLS security (with periodical reloading)
    }, (dReq: IncomingMessage, dRes: ServerResponse) => {
        if(!dReq.headers["host"]) {
            respond(dRes, 422);
    
            return;
        }
    
        const relatedHostname: string = dReq.headers["host"].replace(/:[0-9]+$/, "");
        // TODO: Implement loose wildcard subdomain *.host.name?

        handleSocketConnection(dReq, dRes, relatedHostname);
    }).listen(port, () => {
        // TODO: Notify up
    });

    // TODO: HTTP:80 to HTTPS:433 redirtection server?
    // TODO: Special case (default) for ports 80/433
}

export function embedSpace(spaceEnv: ISpaceEnv) {
    const processPool: ChildProcessPool = new ChildProcessPool(join(__dirname, "../process/server"), spaceEnv);

    processPool.init();

    const spaceConfig: Config = new Config("...");

    const hostname: string = "localhost";

    const space: ISpace = {
        childProcessPool: processPool,
        config: spaceConfig,
        rateLimiter: new RateLimiter(spaceEnv.MODE.DEV ? Infinity : spaceConfig.data.limit.requestsPerClient)
    };
    
    embeddedSpaces.set(hostname, space);
}


// TODO: Remove DEV from ENV (and use specific dev server?); or keep for staging environments?