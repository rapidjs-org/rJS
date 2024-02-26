import { THeaders } from "../../types";


export class Request {
	private readonly headers: THeaders;
    
	public readonly method: string;
	public readonly url: string;
	public body: string|Buffer;

	constructor(method: string, url: string, headers: THeaders, body?: string) {
		this.method = method;
		this.url = url;
		this.body = body;

		this.headers = {};
		for(const name of Object.keys(headers)) {
			this.headers[name.toLowerCase()] = headers[name];
		}
	}

	public getHeader(name: string): string {
		return this.headers[name.toLowerCase()];
	}
}