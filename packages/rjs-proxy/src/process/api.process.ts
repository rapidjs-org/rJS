import { IRequest, IResponse, handleRequest } from "@rapidjs.org/rjs";


process.on("message", async (sReq: IRequest) => {
	// TODO: Get request handler function to capture online event

	const sRes: IResponse = await handleRequest(sReq);
    
	process.send(sRes);
});

process.send("online");