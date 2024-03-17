type TCommandHandler = (commandParam?: unknown) => unknown;
export declare class IPCServer {
    private static locateIPCFile;
    private static removeSocketFile;
    static clean(associatedPort: number): void;
    static associatedPorts(): number[];
    static message(associatedPort: number, command: string, commandParam?: unknown): Promise<unknown>;
    private readonly commandRegistry;
    constructor(associatedPort: number, listensCallback?: (() => void), errorCallback?: (err: Error) => void);
    registerCommand(command: string, handler: TCommandHandler): this;
}
export {};
//# sourceMappingURL=IPCServer.d.ts.map