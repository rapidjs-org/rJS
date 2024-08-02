import { Socket } from "net";

import { IRequest, handleRequest } from "@rapidjs.org/rjs";


process.on("message", async (data: unknown, socket?: Socket) => {
    await handleRequest(data as IRequest, socket);  // TODO: Get request handler function to capture online event

    process.send("done");
});


process.send("online");