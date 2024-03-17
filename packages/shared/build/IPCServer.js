import { join } from "path";
import { mkdirSync, readdirSync, rmSync } from "fs";
import { createServer, createConnection } from "net";
import { InterruptionHandler } from "./InterruptionHandler";
import { Util } from "./Util";
const _config = {
    "socketNamePrefix": "rjs.proxy."
};
const SOCKET_LOCATION_PREFIX = Util.isUnixBasedOS ? "/tmp/" : "\\\\.\\pipe\\";
Util.isUnixBasedOS && mkdirSync(SOCKET_LOCATION_PREFIX, { recursive: true });
export class IPCServer {
    static locateIPCFile(associatedPort) {
        return join(SOCKET_LOCATION_PREFIX, `${_config.socketNamePrefix}${associatedPort}.sock`);
    }
    static removeSocketFile(associatedPort) {
        const socketLocation = IPCServer.locateIPCFile(associatedPort);
        rmSync(socketLocation, {
            force: true
        });
    }
    static clean(associatedPort) {
        rmSync(IPCServer.locateIPCFile(associatedPort));
    }
    static associatedPorts() {
        return readdirSync(SOCKET_LOCATION_PREFIX, { withFileTypes: true })
            .filter((dirent) => dirent.isSocket())
            .filter((dirent) => new RegExp(`^${_config.socketNamePrefix.replace(/\./g, "\\.")}[0-9]+\\.sock$`).test(dirent.name))
            .map((dirent) => parseInt(dirent.name.match(/[0-9]+/)[0]));
    }
    static message(associatedPort, command, commandParam) {
        return new Promise((resolve, reject) => {
            const client = createConnection(IPCServer.locateIPCFile(associatedPort));
            const proxyIPCPackage = {
                command, commandParam
            };
            client.write(JSON.stringify(proxyIPCPackage));
            client.on("data", (message) => {
                const response = JSON.parse(message.toString());
                response.error
                    ? reject(response.error)
                    : resolve(response.data);
                client.end();
            });
            client.on("error", (err) => {
                reject(err);
                client.end();
            });
        });
    }
    constructor(associatedPort, listensCallback, errorCallback = (() => { })) {
        this.commandRegistry = new Map();
        IPCServer.removeSocketFile(associatedPort);
        const socketLocation = IPCServer.locateIPCFile(associatedPort);
        const server = createServer((socket) => {
            socket.on("data", async (message) => {
                const parsedMessage = JSON.parse(message.toString());
                const commandHandler = this.commandRegistry.get(parsedMessage.command);
                if (commandHandler) {
                    let data, error;
                    try {
                        const response = commandHandler(parsedMessage.commandParam);
                        data = await (!(response instanceof Promise)
                            ? Promise.resolve(response)
                            : response);
                    }
                    catch (err) {
                        error = err.toString();
                    }
                    finally {
                        socket.write(JSON.stringify({
                            data, error
                        }));
                        socket.destroy();
                    }
                }
            });
        })
            .listen(socketLocation, listensCallback);
        server.on("error", errorCallback);
        InterruptionHandler.register(() => {
            server.close();
            IPCServer.removeSocketFile(associatedPort);
        });
    }
    registerCommand(command, handler) {
        this.commandRegistry.set(command, handler);
        return this;
    }
}
