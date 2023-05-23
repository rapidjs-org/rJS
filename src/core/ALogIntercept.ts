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
        if(!data) return;

        let message: string = String(data);

        ALogIntercept.instances.forEach((instance: ALogIntercept) => {
            if(message !== instance.lastMessage.message
            || (Date.now() - instance.lastMessage.timePivot) > 30000) {
        
                instance.lastMessage.count = 1;
                instance.lastMessage.message = message;
                instance.lastMessage.timePivot = Date.now();
        
                return 1;
            }
            
            instance.lastMessage.timePivot = Date.now();

            switch(channelName) {
                case "stdout":
                    instance.handleStderr(message);
                    break;
                case "stderr":
                    instance.handleStderr(message);
                    break;
            }
        });
    }

    protected static writeStdout(message: string) {
        ALogIntercept._stdout(message);
    }

    protected static writesStderr(message: string) {
        ALogIntercept._stderr(message);
    }
    
    constructor() {
        ALogIntercept.instances.push(this);
    }
    
    protected getGroupCount(message: string): number {
        return this.lastMessage.message === message
        ? this.lastMessage.count
        : 0;
    }

    protected abstract handleStdout(message: string): void;
    protected abstract handleStderr(message: string): void;

}


// @ts-ignore
process.stdout.write = (data, callback?) => {
    ALogIntercept.handle(data, "stdout");
};

// @ts-ignore
process.stderr.write = (data, callback?) => {
    ALogIntercept.handle(data, "stderr");
};