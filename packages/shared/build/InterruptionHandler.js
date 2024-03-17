import { EventEmitter } from "events";
const terminationEmitter = new EventEmitter();
["SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR1", "SIGUSR2"]
    .forEach(signal => {
    process.on(signal, (code) => process.exit(code));
});
["uncaughtException", "unhandledRejection"]
    .forEach(signal => {
    process.on(signal, (err) => terminationEmitter.emit("uncaught", err));
});
process.on("exit", (code) => {
    terminationEmitter.emit("terminate", code);
});
export class InterruptionHandler {
    static register(callback) {
        terminationEmitter.on("terminate", callback);
    }
    static registerUncaught(callback) {
        terminationEmitter.on("uncaught", callback);
    }
}
