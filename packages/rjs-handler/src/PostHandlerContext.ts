import { TSerializable } from "./.shared/global.types";
import { ISerialRequest } from "./.shared/global.interfaces";
import { AHandlerContext } from "./AHandlerContext";
import { Config } from "./Config";
import { RPCController, TRpcMember } from "./RPCController";

type THandlerRequestBody = {
    name: string;

    args?: TSerializable[];
};

export class PostHandlerContext extends AHandlerContext {
    private readonly rpcController: RPCController;

    constructor(
        sReq: ISerialRequest,
        config: Config,
        rpcController: RPCController
    ) {
        super(sReq, config);

        this.rpcController = rpcController;
    }

    public async process(): Promise<void> {
        let params: THandlerRequestBody;
        try {
            params = this.request.getBody().json<THandlerRequestBody>();
        } catch (err: unknown) {
            this.response.setStatus(400);

            this.respond();

            console.error(err);

            return;
        }

        if (
            !this.rpcController.hasEndpoint(
                this.request.url.pathname,
                params.name
            )
        ) {
            this.response.setStatus(404);

            this.respond();

            return;
        }

        const requestedRpcMember: TRpcMember =
            this.rpcController.invokeEndpoint(
                this.request.url.pathname,
                params.name
            );
        let responseData: TSerializable =
            requestedRpcMember instanceof Function
                ? requestedRpcMember(...(params.args ?? []))
                : requestedRpcMember;
        responseData = (
            responseData instanceof Promise ? await responseData : responseData
        ) as TSerializable;

        this.response.setBody(JSON.stringify(responseData));

        this.response.setHeader("Content-Type", "application/json");

        this.respond();
    }
}
