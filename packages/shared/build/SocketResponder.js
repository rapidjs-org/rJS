import { STATUS_CODES } from "http";
import __config from "./__config.json";
export class SocketResponder {
    static respond(socket, status, headers = {}, message) {
        const CRLF = "\r\n";
        socket.write(`${`HTTP/${__config.httpVersion} ${status} ${STATUS_CODES[status]}`}${CRLF}${Object.entries(headers)
            .map((value) => `${value[0]}: ${value[1]}`)
            .join(CRLF)}${CRLF}${message ? CRLF : ""}`);
        socket.write(message !== null && message !== void 0 ? message : "");
        socket.end();
    }
}
