import { ServerResponse } from "http";
import { Socket } from "net";
import { join } from "path";
import { brotliCompressSync, deflateSync, gzipSync } from "zlib";

import { IRequest } from "../interfaces";
import { THeaders, TResponseOverload } from "../types";
import { respond } from "../respond";
import * as print from "../print";

import { ThreadPool } from "./ThreadPool";


process.on("uncaughtException", (err: Error) => {
    console.error(err);
    
    // TODO: Handle

    signalDone(); // TODO: Signal error (or keep "error"?)
});


const threadPool: ThreadPool = new ThreadPool(join(__dirname, "./thread/thread"));

threadPool.init();


process.on("message", async (sReq: IRequest, socket: Socket) => {
    /* socket.write("HTTP/1.1 200 Successful\r\n");
    socket.write("Test-Header: Hello World!\r\n");
    socket.write("\r\n");
    socket.end("Test"); */

    const dRes: any = new ServerResponse(null); // TODO: Remove (compilation dummy)

    threadPool.assign(sReq)
    .then((sResOverload: TResponseOverload) => {
        if(typeof sResOverload === "number"
        || sResOverload.message instanceof Buffer) {
            return respond(dRes, sResOverload);
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

        end(dRes, sResOverload, {
            "Content-Encoding": acceptedEncoding
        });
    })
    .catch(err => {
        print.error(err);

        end(dRes, 500);
    });
});


function signalDone() {
    process.send("done");
}

function end(dRes: ServerResponse, sResOverload: TResponseOverload, prioritizedHeaders?: THeaders) {
    respond(dRes, sResOverload, prioritizedHeaders);

    signalDone();
}