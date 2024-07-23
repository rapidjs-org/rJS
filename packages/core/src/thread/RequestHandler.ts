import { IncomingMessage, ServerResponse } from "http";
import { join } from "path";

import { TJSON } from "@common/types";

import { THTTPMethod } from "./types";
import { ISerialRequest, ISerialResponse } from "./interfaces";
import { Response } from "./Response";
import { EmptyResponse } from "./EmptyResponse";
import { GetResponse } from "./get/GetResponse";
import { PostResponse } from "./post/PostResponse";
import { VFS } from "./VFS";


export class RequestHandler {
    public static parseSerialRequest(request: IncomingMessage): Promise<ISerialRequest> {
        const method: THTTPMethod = request.method.toUpperCase() as unknown as THTTPMethod;
        
        const serialRequest: ISerialRequest = {
            method: method,
            url: request.url,
            headers: request.headers,
            clientIP: request.socket.remoteAddress
        };
        
        return new Promise((resolve) => {
            if(serialRequest.method !== "POST") {
                resolve(serialRequest);
                
                return;
            }
            
            const body: Buffer[] = [];
            request.on("data", (chunk: Buffer) => body.push(chunk));
            request.on("end", () => {
                serialRequest.body = Buffer.concat(body);
                
                resolve(serialRequest);
            });
        });
    }

    public static applySerialResponse(serialResponse: ISerialResponse, response: ServerResponse) {
        response.statusCode = serialResponse.status;
        
        for(let header in serialResponse.headers) {
            response.setHeader(header, serialResponse.headers[header]);
        }
        
        serialResponse.body
        && response.write(serialResponse.body.toString());
        
        response.end();
    }

    private readonly vfs: VFS;
    private readonly renderers: string[];

    constructor(options: TJSON = {}) {
        const optionsWithDefaults: TJSON = {
            workingDir: process.cwd(),
            publicDirName: "public",
            renderers: [],

            ...options
        };

        this.vfs = new VFS(join(optionsWithDefaults.workingDir as string, optionsWithDefaults.publicDirName as string));
        this.renderers = optionsWithDefaults.renderers as string[];
    }

    private createResponse(serialRequest: ISerialRequest): Response {
        switch(serialRequest.method) {
            case "GET":
                return new GetResponse(serialRequest, this.vfs, this.renderers);
            case "POST":
                return new PostResponse(serialRequest, this.vfs);
        }
        return new EmptyResponse();
    }

    public async handle(request: ISerialRequest|IncomingMessage): Promise<ISerialResponse> {
        const serialRequest: ISerialRequest = (request instanceof IncomingMessage)
        ? await RequestHandler.parseSerialRequest(request)
        : request;
        
        return new Promise((resolve) => {
            this.createResponse(serialRequest)
            .once("end", (serialResponse: ISerialResponse) => resolve(serialResponse))
            .process();
        });
    }
    
    public async apply(sourceObj: IncomingMessage|ISerialRequest|ISerialResponse, response: ServerResponse) {
        const serialObj: ISerialRequest|ISerialResponse = (sourceObj instanceof IncomingMessage)
        ? await RequestHandler.parseSerialRequest(sourceObj)
        : sourceObj;
        const serialResponse: ISerialResponse = !(serialObj as ISerialResponse).status
        ? await this.handle(serialObj as ISerialRequest)
        : serialObj as ISerialResponse;

        RequestHandler.applySerialResponse(serialResponse, response);
    }
}