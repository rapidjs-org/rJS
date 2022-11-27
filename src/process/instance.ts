import { join } from "path";
import { ServerResponse } from "http";

import { IRequest, IResponse } from "../interfaces";

import { ThreadPool } from "./ThreadPool";


process.on("uncaughtException", (err: Error) => {
    console.error(err);

    // TODO: Handle

    process.send("done");   // TODO: Signal error (or keep "error"?)
});


const threadPool: ThreadPool = new ThreadPool(join(__dirname, "./thread"));

threadPool.init();

process.on("message", async (sReq: IRequest, dRes: ServerResponse) => {
    const sRes: IResponse = await threadPool.assign(sReq);

    dRes.end(sRes.message);

    process.send("done");
});