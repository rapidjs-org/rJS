import { THeaders } from "../types";
import { IHTTPMessage } from "../interfaces";


export class HTTPParser {
    public static parseBytes(data: Buffer): IHTTPMessage {
		const message: string[] = data.toString().split(/\n\s*\n/);
		const messageHead: string[] = message[0].trim().split(/\s*\n/g);
		const messageBody: string = message[1];

        const startLine: string[] = messageHead.shift().split(/\s+/g);
        const spec: string[] = startLine[2].split(/\//);
        
        const headers: THeaders = Object.fromEntries(
            messageHead
            .map((line: string) => line.split(/\s*:\s*/))
        );
        
        return {
		    version: spec[1],
            protocol: spec[0],
		    method: startLine[0],
		    url: startLine[1],
            headers: headers,
            body: messageBody ?? null
        };
    }
}