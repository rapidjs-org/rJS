import { Socket } from "net";
import { join } from "path";
import { gzipSync, brotliCompressSync, deflateSync } from "zlib";

import { IRequest, IIntermediateRequest, IHighlevelURL, IHighlevelLocale, IHighlevelEncoding, THighlevelCookieIn } from "../interfaces";
import { TResponseOverload } from "../types";
import { CONFIG } from "../space/CONFIG";

import { ThreadPool } from "./ThreadPool";  // TODO: Dynamically retrieve context
import { respond } from "./respond";


interface IAcceptHeaderPart {
    name: string;
    quality: number;
}


process.on("uncaughtException", (err: Error) => {
    console.error(err);
    
    // TODO: Handle

    signalDone(); // TODO: Signal error (or keep "error"?)
});


// TODO: Implement activeShellApp
const threadPool: ThreadPool = new ThreadPool(join(__dirname, "./thread/thread"));


threadPool.init();


process.on("message", async (iReq: IIntermediateRequest, socket: Socket) => {
    const clientIP: string = iReq.headers["x-forwarded-for"]
    ? [ iReq.headers["x-forwarded-for"] ].flat()[0]
        .split(/,/g)
        .shift()
        .trim()
    : socket.remoteAddress;

    if(iReq.url.length > CONFIG.data.limit.urlLength) {
        end(socket, 414);

        return;
    }
    
    const method: string = iReq.method.toUpperCase();

    let bodyString: string;
    if([ "POST", "PUT", "OPTIONS" ].includes(method)) {
        try {
            const bodyChunks: string[] = [];

            bodyString = await new Promise((resolve, reject) => {
                // TODO: Read body from socket
                /* iReq.on("data", (chunk: string) => {
                    bodyChunks.push(chunk);
                });
                
                iReq.on("end", () => {
                    try {
                        resolve(bodyChunks.length ? bodyChunks.join("") : null);
                    } catch(err) {
                        reject(err);
                    }
                });
                
                iReq.on("error", err => {
                    reject(err);
                }); */
            });
        } catch(err) {
            console.error(err);

            end(socket, 422);
            
            return;
        }
    }

    if(bodyString?.length >= CONFIG.data.limit.payloadSize) {
        end(socket, 413);

        return;
    }

    const host: string = [ iReq.headers["host"] ].flat()[0] // TODO: Get upon start up
    .replace(/^(https?:\/\/)?/, `http${CONFIG.data.tls ? "s" : ""}://`)   // TLS sufficient? HTTPS embed requirement, so should be present
    .replace(/(:[0-9]+)?$/, `:${CONFIG.data.port ?? 80}`);    // TODO: Default?
    
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
        ip: clientIP,

        method: method,
        url: highlevelURL,

        cookies: highlevelCookies,
        encoding: highlevelEncoding,
        locale: highlevelLocale,

        headers: iReq.headers,  // TODO: High-level headers interface?
        
        ...(bodyString ? {
            bodyString: bodyString
        } : {})
    };
    
    // Remove auto-processed headers from serialized high-level representation
    delete sReq.headers["host"];
    delete sReq.headers["accept-encoding"];
    delete sReq.headers["accept-language"];
    delete sReq.headers["cookie"];

    threadPool.assign(sReq)
    .then((sResOverload: TResponseOverload) => {
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
});


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

function signalDone() {
    process.send("done");
}

function end(...args: unknown[]) {
    signalDone();

    respond.apply(null, args);
}