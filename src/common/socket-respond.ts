import { Socket } from "net";
import { STATUS_CODES } from "http";

import { TStatusCode, THeaders } from "../types";

import __config from "../__config.json";


export function socketRespond(socket: Socket, status: TStatusCode, headers: THeaders = {}, message?: Uint8Array) {
	const CRLF = "\r\n";
	socket.write(`${
		`HTTP/${__config.httpVersion} ${status} ${STATUS_CODES[status]}`
	}${CRLF}${
		Object.entries(headers)
		.map((value: [ string, string ]) => `${value[0]}: ${value[1]}`)
		.join(CRLF)
	}${CRLF}${message ? CRLF : ""}`);
	
	socket.write(message ?? "");
	
	socket.end();
}