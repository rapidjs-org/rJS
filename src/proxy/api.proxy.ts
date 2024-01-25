import { join } from "path";
import { fork } from "child_process";
import { Socket } from "net";
import { createServer } from "net";
import { Context } from "../common/Context";


const child = fork(join(__dirname, "../process/api.process"));
const port: number = Context.CONFIG.get<number>("port");

// TODO: Pool
// TODO: One core trap


const server = createServer({ pauseOnConnect: true });
server.on("connection", (socket: Socket) => {
	child.send("socket", socket);
});
server.listen(port, () => {
	console.log(`Server listening on port ${port} [${Context.MODE} mode]`);
}); 