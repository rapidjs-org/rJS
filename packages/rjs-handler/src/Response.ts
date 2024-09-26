import { ISerialResponse } from "./.shared/global.interfaces";
import { THeaders, TSerializable, TStatus } from "./.shared/global.types";

export class Response {
	private readonly headers: THeaders = {};

	private status: number = 200;
	private body?: Buffer | TSerializable;

	public hasCompressableBody: boolean = true;

	public setHeader(
		name: string,
		value: TSerializable | readonly TSerializable[]
	) {
		const capitalizedName = name
            .toLowerCase()
            .replace(
            	/(^|-)([a-z])/g,
            	(_, delimiter: string, symbol: string) =>
            		`${delimiter}${symbol.toUpperCase()}`
            );
		this.headers[capitalizedName] = [value].flat().join(", ");
	}

	public setBody(body: TSerializable) {
		this.body = body;
	}

	public getBody(): TSerializable {
		return this.body;
	}

	public setStatus(status: TStatus) {
		this.status = status;
	}

	public serialize(): { body: Buffer } & ISerialResponse {
		return {
			status: this.status as TStatus,
			headers: this.headers,
			body: !Buffer.isBuffer(this.body)
				? Buffer.from((this.body as string) ?? "", "utf-8")
				: this.body
		};
	}
}
