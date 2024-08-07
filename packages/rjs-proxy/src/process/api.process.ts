import { IRequest, IResponse, Context } from "@rapidjs.org/rjs";


const context: Context = new Context(process.cwd());
// TODO: Listen for context online to communicate ready state (?)


process.on("message", async (sReq: IRequest) => {
	const sRes: IResponse = await context.handleRequest(sReq);

	process.send(sRes);
});

process.send("online");
