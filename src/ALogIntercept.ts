type TChannelWrite = (data: string|Uint8Array, callback?: BufferEncoding|((err?: Error) => void)) => void;


interface ILastMessage {
    count: number;
    message: string;
    timePivot: number;
}


export abstract class ALogIntercept {

    private static _stdout: TChannelWrite = process.stdout.write.bind(process.stdout);
    private static _stderr: TChannelWrite = process.stdout.write.bind(process.stderr);
    
    private readonly lastMessage: ILastMessage = {
        count: 0,
        message: null,
        timePivot: 0
    };

    constructor() {
        // @ts-ignore
        process.stdout.write = (data, callback?) => {
            const message: string = this.handleStdout(String(data));

            return this.write(ALogIntercept._stdout, message);
        };

        // @ts-ignore
        process.stderr.write = (data, callback?) => {
            const message: string = this.handleStderr(String(data));

            return this.write(ALogIntercept._stderr, message);
        };
    }

    private write(channelWrite: TChannelWrite, message: string) {
        if(!message) return;
        
        if(message !== this.lastMessage.message
        || (Date.now() - this.lastMessage.timePivot) > 5000) {
            channelWrite(message);

            this.lastMessage.count = 1;
            this.lastMessage.message = message;
            this.lastMessage.timePivot = Date.now();

            return message;
        }

        this.lastMessage.timePivot = Date.now();

        channelWrite(`\x1b[s\x1b[1A\x1b[${
            message
            .trim()
            .split(/\r|\n/g)
            .pop()
            .replace(/\x1b\[[0-9;:]+m/g, "")
            .length
        }C\x1b[2m\x1b[31m (${++this.lastMessage.count})\x1b[0m\n\x1b[1B`);
    }

    protected abstract handleStdout(data: string): string;
    protected abstract handleStderr(data: string): string;
    
}