type TChannelWrite = (data: string|Uint8Array, callback?: BufferEncoding|((err?: Error) => void)) => void;


interface ILastMessage {
    count: number;
    message: string;
    timePivot: number;
}


export abstract class ALogIntercept {

    private static readonly lastMessage: ILastMessage = {
        count: 0,
        message: null,
        timePivot: 0
    };

    public static readonly _stdout: TChannelWrite = process.stdout.write.bind(process.stdout);
    public static readonly _stderr: TChannelWrite = process.stdout.write.bind(process.stderr);
    public static readonly instances: ALogIntercept[] = [];
    
    constructor() {
        ALogIntercept.instances.unshift(this);
    }
    
    public static getGroupCount(message: string): number {
        if(message !== ALogIntercept.lastMessage.message
        || (Date.now() - ALogIntercept.lastMessage.timePivot) > 5000) {
    
            ALogIntercept.lastMessage.count = 1;
            ALogIntercept.lastMessage.message = message;
            ALogIntercept.lastMessage.timePivot = Date.now();
    
            return 1;
        }
        
        ALogIntercept.lastMessage.timePivot = Date.now();

        return ++ALogIntercept.lastMessage.count;
    }
    
    public abstract handleStdout(message: string, groupCount: number): string;
    public abstract handleStderr(message: string, groupCount: number): string;
    
}


// @ts-ignore
process.stdout.write = (data, callback?) => {
    let message: string = String(data);

    const groupCount: number = ALogIntercept.getGroupCount(message);

    ALogIntercept.instances.forEach((instance: ALogIntercept) => {
        message = instance.handleStdout(message, groupCount);
    });

    if(!message) return;

    return ALogIntercept._stdout(message);
};

// @ts-ignore
process.stderr.write = (data, callback?) => {
    let message: string = String(data);
    
    const groupCount: number = ALogIntercept.getGroupCount(message);

    ALogIntercept.instances.forEach((instance: ALogIntercept) => {
        message = instance.handleStderr(message, groupCount);
    });

    if(!message) return;

    return ALogIntercept._stderr(message);
};