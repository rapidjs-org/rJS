import { EventEmitter } from "events";

import { AsyncMutex } from "./AsyncMutex";


type TInterceptCallback = (message: string) => string;

interface IMessagestamp {
    message: string;
    count: number;
}


const STDOUT_WRITE = process.stdout.write.bind(process.stdout);

const logMutex: AsyncMutex<void> = new AsyncMutex();

let lastMessagestamp: IMessagestamp|null;


process.stdout.write = (message: string, ...args): boolean => {
    logMutex.lock(() => {
        let modifiedMessage: string = message;
        
        LogIntercept.instances
        .forEach((instance: LogIntercept) => {
            modifiedMessage = instance.apply(modifiedMessage);
        });

        if(lastMessagestamp?.message !== message) {
            lastMessagestamp = {
                message,

                count: 1
            };
            
            STDOUT_WRITE(modifiedMessage, ...args);

            LogIntercept.instances
            .forEach((instance: LogIntercept) => {
                instance.emit("write", modifiedMessage, message);
            });

            return;
        }

        const createIndexer = (): string => ` \x1b[2m\x1b[31m(${lastMessagestamp.count})\x1b[0m\n`;

        STDOUT_WRITE(`\x1b[1A${
            Array.from({ length: createIndexer().length }, () => "\b").join("")
        }`, () => {
            lastMessagestamp.count++;
            
            modifiedMessage = `${modifiedMessage}`
            .replace(/(\n?)$/, createIndexer());

            STDOUT_WRITE(modifiedMessage, ...args);
        });
    });

    return true;
};


export class LogIntercept extends EventEmitter {
    public static instances: LogIntercept[] = [];

    private readonly interceptCallback: TInterceptCallback;

    constructor(interceptCallback: TInterceptCallback) {
        super();

        this.interceptCallback = interceptCallback;

        LogIntercept.instances.push(this);
    }

    public apply(message: string) {
        return this.interceptCallback(message);
    }
}