import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";


export type TAdapter = (sReq: ISerialRequest) => ISerialResponse|Promise<ISerialResponse>;


export class Adapter {
    private readonly adapterModulePath: string;

    private readonly options?: unknown;

    constructor(adapterModulePath: string, options?: unknown) {
        this.adapterModulePath = adapterModulePath;
        this.options = options;
    }

    public loadHandler(): Promise<TAdapter> {
        return new Promise((resolve) => {
            import(this.adapterModulePath)
            .then(async (adapterAPI: {
                default: (applicationOptions: unknown) => TAdapter|Promise<TAdapter>;
            }) => {
                resolve(await adapterAPI.default(this.options));
            });
        });
    }
}