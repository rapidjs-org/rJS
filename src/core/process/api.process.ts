/**
 * Proxied process cluster node API module.
 */


import { Socket } from "net";
import { join } from "path";
import { gzipSync, brotliCompressSync, deflateSync } from "zlib";

import { THeaders, TJSONObject, TResponseOverload, THighlevelCookieIn } from "../../_types";
import { IBasicRequest, IRequest, IHighlevelURL, IHighlevelLocale, IHighlevelEncoding } from "../../_interfaces";

import { EmbedContext } from "../EmbedContext";
import { ErrorControl } from "../ErrorControl";

import { ThreadPool } from "./ThreadPool";  // TODO: Dynamically retrieve context
import { Config } from "./Config";
import { Response } from "./Response";
import { RateLimiter } from "./RateLimiter";


/**
 * Interface encoding typical accept header information
 * including to a coded name and the respectively given
 * quality/priority value.
 */
interface IAcceptHeaderPart {
    name: string;
    quality: number;
}


// TODO: Implement activeShellApp
const threadPool: ThreadPool = new ThreadPool(join(__dirname, "./thread/api.thread"));
const rateLimiter: RateLimiter<string> = new RateLimiter(
    EmbedContext.global.mode.DEV
    ? Infinity
    : Config.global.get("limit", "requestsPerClient").number()
);


threadPool.init();


/*
 * Catch any unhandled exception within this worker process
 * in order to prevent process termination, but simply handle
 * the error case for the respective request and feeding back
 * this worker process to the idle candidate queue within the
 * parent process.
 */
new ErrorControl(() => {
    signalDone();   // TODO: Signal error (or keep "error"?)
});


/**
 * Proxy activation interface (via worker message listener).
 * Explicit export member invocation in standalone setup.
 */
process.on("message", handleRequest);


/**
 * Parse a given accept header based on the typical list and
 * optional quality syntax:
 * <name>(;q=<quality:[0,1]>)?(,<name>(;q=<quality:[0,1]>)?)*
 * @param header Header value (optionally multiple levels ~ array)
 * @returns Data in interfaced accept header encoding structure
 */
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

/**
 * Signal the parent process the work cycle assigned from the
 * parent has been completed in order to have it fed back to
 * the idle candidate queue.
 */
function signalDone() {
    // Ignore in standlone mode => try
    try {
        process.send("done");
    } catch {}
}

/**
 * End a request by sending a specific response, followed by
 * signaling the parent process pool the worker process has
 * therefore completed the current processing cycle.
 * @param socket Related conenction socket
 * @param sResOverload Response specification object or status overload
 * @param prioritizedHeaders Headers to prioritize over implicitly set ones
 */
function end(socket: Socket, sResOverload: TResponseOverload, prioritizedHeaders?: THeaders) {
    signalDone();

    new Response(socket, sResOverload, prioritizedHeaders);
}


/*
 * Handkle messages posted from parent process / module being
 * consumed as worker process or module activations respectively
 * or module and thus invoking its cycle routine. Inherently, any
 * unqualified request is prematurely closed with an according
 * status code.
 * 
 * The cycle does prepare the basic-level request that is recieved 
 * hrough the notification in order to pass it on to the thread
 * which is supposed to handle the generically prepared request
 * package in accordance with the defined shell server application
 * providing the concrete server application context. At that, the
 * processing complexity is distributed to the threads favoring
 * maximum throughput performance.
 */
export async function handleRequest(iReq: IBasicRequest, socket: Socket) {
    const clientIP: string = socket.remoteAddress;

    // TODO: Benchmark rate limiter location/process level for
    // asssessing the different and thus an optimum performance
    // measure
    // Block if exceeds rate limit
    if(!rateLimiter.grantsAccess(clientIP)) return end(socket, 429);
    
    // Block if exceeds URL length
    if(iReq.url.length > Config.global.get("limit", "urlLength").number()) return end(socket, 414);
    
    // Parse body if is payload effective method
    const method: string = iReq.method.toUpperCase();
    
    let body: TJSONObject;
    if([ "POST", "PUT", "OPTIONS" ].includes(method)) {
        let bodyBuffer: string = "";
        let chunk: Buffer;

        while(chunk = socket.read()) {
            bodyBuffer += chunk.toString();

            if(bodyBuffer.length > Config.global.get("limit", "payloadSize").number()) return end(socket, 413);
        }
    }
    
    // Construct remaining relevant request information
    const dynamicURL: URL = new URL(iReq.url);
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

    // TODO: Accept header uniformal parse interface (and extension)
    const highlevelLocale: IHighlevelLocale[] = parseAcceptHeader(iReq.headers["accept-language"])
    .map((locale: IAcceptHeaderPart) => {
        const parts: string[] = locale.name.match(/^([a-z]+|\*)(-([A-Z]+))?$/);
        
        return parts
        ? {
            language: parts[1],
            quality: locale.quality,

            ... parts[3]
            ? {
                region: parts[3]
            }: {}
        }
        : null;
    })
    .filter((locale: IHighlevelLocale) => locale);

    const highlevelEncoding: IHighlevelEncoding[] = parseAcceptHeader(iReq.headers["accept-encoding"])
    .map((encoding: IAcceptHeaderPart) => {
        return {
            type: encoding.name,
            quality: encoding.quality
        }
    });   // TODO: Streamline accept header parsed types ("quality header"?)

    const highlevelCookies: THighlevelCookieIn = {};
    [ iReq.headers["cookie"] ].flat()[0]
    ?.split(/;/g)
    .forEach((cookie: string) => {
        if(!/\s*[^;, ]+=.+\s*/.test(cookie)) return;

        const parts: string[] = cookie.split(/=/);
        let value: string|number|boolean;
        try {
            value = JSON.parse(parts[1]);
        } catch {
            value = parts[1];
        }

        highlevelCookies[parts[0].trim()] = value;
    });

    // Construct high-level thread provision request object
    const sReq: IRequest = {
        ip: clientIP,
        method: method,
        url: highlevelURL,
        cookies: highlevelCookies,
        encoding: highlevelEncoding,
        locale: highlevelLocale,
        headers: iReq.headers,  // TODO: High-level headers interface?
        
        ...(body ?? {})
    };
    
    // Remove auto-processed headers from high-level request
    // representation
    delete sReq.headers["host"];
    delete sReq.headers["accept-encoding"];
    delete sReq.headers["accept-language"];
    delete sReq.headers["cookie"];
    
    // Assign accordingly prepared request data to worker thread
    // for individual processing
    threadPool.assign(sReq)
    .then((sResOverload: TResponseOverload) => {
        // Send response as received from finished worker routine and close socket
        if(typeof sResOverload === "number"
        || sResOverload.message instanceof Buffer) {
            return end(socket, sResOverload);
        }

        sResOverload.message = (typeof sResOverload.message !== "string")
        ? String(sResOverload.message)
        : sResOverload.message;

        let acceptedEncoding: string = sReq.encoding
        .shift()?.type
        .replace(/^\*$/, "gzip");

        // Encode message as supported and qualified
        switch(acceptedEncoding) {
            case "gzip":
                sResOverload.message = gzipSync(sResOverload.message);
                break;
            case "br":
                sResOverload.message = brotliCompressSync(sResOverload.message);
                break;
            case "deflate":
                sResOverload.message = deflateSync(sResOverload.message);
                break;
            default:
                sResOverload.message = Buffer.from(sResOverload.message, "utf-8");

                acceptedEncoding = null;
        }

        end(socket, sResOverload, {
            "Content-Encoding": acceptedEncoding
        });
    })
    .catch(err => {
        console.error(err);
        
        end(socket, 500);
    });
}