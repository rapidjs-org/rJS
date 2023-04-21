type TChannelWrite = (data: string|Uint8Array, callback?: BufferEncoding|((err?: Error) => void)) => void;


export abstract class ALogIntercept {

    private _stdout: TChannelWrite;
    private _stderr: TChannelWrite;

    constructor() {
        this._stdout = process.stdout.write.bind(process.stdout);
        // @ts-ignore
        process.stdout.write = (data, callback?) => {
            const message: string = this.handleStdout(String(data));

            return this._stdout(message, callback);
        };

        this._stderr = process.stderr.write.bind(process.stderr);
        // @ts-ignore
        process.stderr.write = (data, callback?) => {
            const message: string = this.handleStderr(String(data));

            return this._stderr(message, callback);
        };
    }

    protected abstract handleStdout(data: string): string;
    protected abstract handleStderr(data: string): string;
    
}