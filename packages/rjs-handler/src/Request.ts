import { ISerialRequest } from "./.shared/global.interfaces";
import { THeaders, TSerializable } from "./.shared/global.types";

interface IWeightedHeader {
    value: string;
    quality: number;
}

export class Request {
    private readonly headers: THeaders;
    private readonly body: string;

    public readonly url: URL;
    public readonly clientIP: string;

    constructor(sReq: ISerialRequest) {
        this.headers = Object.fromEntries(
            Object.entries(sReq.headers).map((value: [string, string]) => {
                value[0] = value[0].toLowerCase();
                return value;
            })
        );
        this.body = sReq.body;
        this.url = new URL(`http://localhost${sReq.url}`);
        this.clientIP = sReq.clientIP;
    }

    public getHeader(name: string): TSerializable {
        return [this.headers[name.toLowerCase()] ?? null].flat()[0];
    }

    public getWeightedHeader(name: string): string[] {
        const value = this.getHeader(name) as string;

        if (!value) return [];

        const values: string[] = value.split(/,/g);
        return values
            .map((value: string) => {
                const valueParts: string[] = value.split(/;q=(?=[01]\.[0-9])/g);
                return {
                    value: valueParts[0].trim(),
                    quality:
                        valueParts.length > 1 ? parseFloat(valueParts[1]) : 1.0
                };
            })
            .filter((a: IWeightedHeader) => a.quality > 0)
            .sort(
                (a: IWeightedHeader, b: IWeightedHeader) =>
                    a.quality - b.quality
            )
            .sort((a: IWeightedHeader, b: IWeightedHeader) => {
                return (
                    (a.value.match(/\*/g) || []).length -
                    (b.value.match(/\*/g) || []).length
                );
            })
            .map((a: IWeightedHeader) => a.value);

        // TODO: Not Acceptable state ?
    }

    public getBody() {
        const $this: Request = this;
        return {
            text: () => $this.body,
            json<T>() {
                return ($this.body ? JSON.parse($this.body) : {}) as T;
            }
        };
    }
}
