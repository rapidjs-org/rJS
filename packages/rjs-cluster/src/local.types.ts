import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";

export type TAdapter = (sReq: ISerialRequest) => ISerialResponse|Promise<ISerialResponse>;

export type TAdapterModule = {
    default: (applicationOptions: unknown) => TAdapter;
};