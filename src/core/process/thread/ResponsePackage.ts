import { TCookies, THeaders } from "../../_types";
import { IResponse } from "../../_interfaces";


/**
 * Class representing a constructable interface for creating
 * core interpretation contrained response data package based
 * on the respectively defined interface.
 */
export class ResponsePackage implements IResponse {
    public readonly status: number;
    public readonly cookies?: TCookies;
    public readonly headers?: THeaders;
    public readonly message?: string | number | boolean | Buffer;

    constructor(message: string, status: number = 200, headers: THeaders = {}, cookies: TCookies = {}) {
        this.message = message;
        this.status = status;
        this.headers = headers;
        this.cookies = cookies;
    }

}