import { EventEmitter } from "stream";


type TChannelWrite = (data: string|Uint8Array, callback?: BufferEncoding|((err?: Error) => void)) => void;


export class LogIntercept extends EventEmitter {
    
    private static readonly _stdout: TChannelWrite = process.stdout.write.bind(process.stdout);
    public static readonly _stderr: TChannelWrite = process.stdout.write.bind(process.stderr);

    public static readonly instances: LogIntercept[] = [];

    public static writeStdout(message: string) {
        LogIntercept._stdout(message);
    }

    public static writeStderr(message: string) {
        LogIntercept._stderr(message);
    }
    
    constructor() {
        super();

        LogIntercept.instances.push(this);
    }

}


// @ts-ignore
process.stdout.write = (data, callback?) => {
    if(!data) return;

    let message: string = String(data);
    
    LogIntercept.instances.forEach((instance: LogIntercept) => {
        instance.emit("stdout", message);
    });
};

// @ts-ignore
process.stderr.write = (data, callback?) => {
    if(!data) return;

    let message: string = String(data);
    
    LogIntercept.instances.forEach((instance: LogIntercept) => {
        instance.emit("stderr", message);
    });
};