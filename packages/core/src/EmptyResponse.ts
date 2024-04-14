import { TStatus } from "@common/types";

import { Response } from "./Response";


export class EmptyResponse extends Response {
    constructor(status: TStatus = 405) {
        super(null);

        this.setStatus(status);
    }

    public process() {
        this.close();
    }
}