import { IResponse } from "../process/interfaces";
import { THeaders, TStatusCode } from "../process/types";


export class Response {
	private readonly headers: THeaders = {};
	private status: number = 200;

	public message: string|Buffer;

	public setHeader(name: string, value: unknown) {
		this.headers[name] = value.toString();
	}

	public setStatus(status: TStatusCode) {
		this.status = status;
	}

	public setMessage(message: string|Buffer) {
		this.message = message;
	}

	public serialize(): IResponse {
		return {
			headers: this.headers,
			status: this.status,
			message: this.message
		};
	}
}