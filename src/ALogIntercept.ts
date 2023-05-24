type TChannelWrite = (data: string|Uint8Array, callback?: BufferEncoding|((err?: Error) => void)) => void;

interface ILastMessage {
    count: number;
    message: string;
    timePivot: number;
}


export abstract class ALogIntercept {
    
    private static readonly _stdout: TChannelWrite = process.stdout.write.bind(process.stdout);
    private static readonly _stderr: TChannelWrite = process.stdout.write.bind(process.stderr);
    
    public static readonly instances: ALogIntercept[] = [];
    
    private readonly lastMessage: ILastMessage = {
        count: 0,
        message: null,
        timePivot: 0
    };

    public static handle(data: unknown, channelName: string) {
        ALogIntercept.instances.forEach((instance: ALogIntercept) => {
            instance.handle(String(data), channelName);
        });
    }

    protected static writeStdout(message: string) {
        ALogIntercept._stdout(message);
    }

    protected static writeStderr(message: string) {
        ALogIntercept._stderr(message);
    }
    
    constructor() {
        ALogIntercept.instances.push(this);
    }
    
    protected abstract handleStdout(message: string): void;
    protected abstract handleStderr(message: string): void;

    protected getGroupCount(message: string): number {
        return this.lastMessage.message === message
        ? this.lastMessage.count
        : 0;
    }
    
    public handle(message: string = "", channelName: string = "stdout") {
        this.lastMessage.count = (message === this.lastMessage.message
            && (Date.now() - this.lastMessage.timePivot) <= 30000)
        ? (this.lastMessage.count + 1) : 1;
        this.lastMessage.message = message;
        this.lastMessage.timePivot = Date.now();
        
        switch(channelName) {
            case "stdout":
                this.handleStdout(message);
                break;
            case "stderr":
                this.handleStderr(message);
                break;
        }
    }

}


// @ts-ignore
process.stdout.write = (data, callback?) => {
    ALogIntercept.handle(data, "stdout");
};

// @ts-ignore
process.stderr.write = (data, callback?) => {
    ALogIntercept.handle(data, "stderr");
};