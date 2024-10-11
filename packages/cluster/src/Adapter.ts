export type TAdapter<I = unknown, O = unknown> = (data: I) => O | Promise<O>;

export class Adapter<I, O> {
    private readonly adapterModulePath: string;

    private readonly options?: unknown;

    constructor(adapterModulePath: string, options?: unknown) {
        this.adapterModulePath = adapterModulePath;
        this.options = options;
    }

    public loadHandler(): Promise<TAdapter<I, O>> {
        return new Promise((resolve) => {
            import(this.adapterModulePath).then(
                async (adapterAPI: {
                    default: (
                        applicationOptions: unknown
                    ) => TAdapter<I, O> | Promise<TAdapter<I, O>>;
                }) => {
                    resolve(await adapterAPI.default(this.options));
                }
            );
        });
    }
}
