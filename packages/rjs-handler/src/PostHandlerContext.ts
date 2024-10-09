import { TSerializable } from "./.shared/global.types";
import { ISerialRequest } from "./.shared/global.interfaces";
import { AHandlerContext } from "./AHandlerContext";
import { Config } from "./Config";
import { RPCController, TRpcMember } from "./RPCController";

import _config from "./_config.json";

type THandlerRequestBody = {
    name: string;

    args?: TSerializable[];
};

interface IRequestContext {
    clientIP: string;
}

export class PostHandlerContext extends AHandlerContext {
    private readonly rpcController: RPCController;

    constructor(
        sReq: ISerialRequest,
        config: Config,
        rpcController: RPCController,
        dev: boolean
    ) {
        super(sReq, config, dev);

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

        const requestContext: IRequestContext = {
            clientIP: this.request.clientIP
        };
        const requestedRpcMember: TRpcMember =
            await this.rpcController.invokeEndpoint(
                this.request.url.pathname,
                params.name
            );
        // TODO: Member lookup cache?
        let responseData: TSerializable =
            requestedRpcMember instanceof Function
                ? (() => {
                      const args: unknown[] = params.args ?? [];
                      const argNames = (
                          (requestedRpcMember.toString().split(/\{|=>/) ?? [
                              ""
                          ])[0].match(
                              /[\w_$][\w_$\d]*(\s*,\s*[\w_$][\w_$\d]*)*/g
                          ) ?? [""]
                      )
                          .pop()
                          .split(/\s*,\s*/g);
                      const apiRequestContextArgIndex = argNames.indexOf(
                          _config.apiRequestContextArgName
                      );
                      apiRequestContextArgIndex >= 0 &&
                          args.splice(
                              apiRequestContextArgIndex,
                              0,
                              requestContext
                          );

                      return requestedRpcMember(...args);
                  })()
                : requestedRpcMember;
        responseData = (
            responseData instanceof Promise ? await responseData : responseData
        ) as TSerializable;
        try {
            responseData = JSON.stringify(responseData);
        } catch {}

        this.response.setBody(responseData);

        this.response.setHeader("Content-Type", "application/json");

        this.respond();
    }
}
