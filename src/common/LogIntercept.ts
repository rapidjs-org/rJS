import { EventEmitter } from "events";

import { AsyncMutex } from "./AsyncMutex";


type TInterceptCallback = (message: string) => string;
type TStreamIdentifier = "out" | "err";

interface IMessagestamp {
    message: string;
    count: number;
}


const logMutex: AsyncMutex<void> = new AsyncMutex();

let lastMessagestamp: IMessagestamp|null;


process.stdout.write = bindWrite("out");
process.stderr.write = bindWrite("err");

function bindWrite(streamIdentifier: TStreamIdentifier) {
    const stream = (streamIdentifier === "out")
    ? process.stdout.write.bind(process.stdout)
    : process.stderr.write.bind(process.stderr);

    return (message: string, ...args: unknown[]): boolean => {
        logMutex.lock(() => {
            const formattedMessage: string = message
            .replace(/#([a-z]+)\{([^}]*)\}/i, (_, code: string, formatMessage: string) => {
                const ansii: Record<string, number> = {
                    "B": 1,
                    "I": 3,
                    "r": 31,    
                    "g": 32,
                    "b": 36
                };
                return `${
                    Array.from({ length: code.length }, (_, i: number) => {
                        return `\x1b[${ansii[code.split("")[i]] ?? 0}m`;
                    }).join("")
                }${formatMessage}\x1b[0m`;
            })
            .replace(/(^| )([0-9]+(\.[0-9]+)?)([.)} ]|$)/gi, "$1\x1b[33m$2\x1b[0m$4");
            
            const modifiedMessage: string = LogIntercept.applyAll(streamIdentifier, formattedMessage);

            if(lastMessagestamp?.message != message) {
                lastMessagestamp = {
                    message: formattedMessage,

                    count: 1
                };
                
                stream(modifiedMessage, ...args);

                const cleanMessage = (encodedMessage: string) => {
                    return encodedMessage
                    .replace(/\x1b\[\??[0-9]{1,2}([a-z]|(;[0-9]{3}){0,3}m)/gi, "");
                };
                LogIntercept.instances
                .forEach((instance: LogIntercept) => {
                    instance.emit("write", cleanMessage(modifiedMessage), cleanMessage(formattedMessage));
                });

                return;
            }
            
            const createIndexer = (): string => (lastMessagestamp.count > 1)
            ? ` \x1b[2m\x1b[31m(${lastMessagestamp.count})\x1b[0m\n`
            : "";

            stream(`\x1b[1A${
                Array.from({ length: createIndexer().length }, () => "\b").join("")
            }`, () => {
                lastMessagestamp.count++;

                stream(`${modifiedMessage}`.replace(/(\n?)$/, createIndexer()), ...args);
            });
        });

        return true;
    };
}

// TODO: Split joined messages (?)
export class LogIntercept extends EventEmitter {
    public static instances: LogIntercept[] = [];

    public static applyAll(streamIdentifier: TStreamIdentifier, message: string): string {
	    if(!message.trim().length) return message;

        let modifiedMessage: string = message;
        
        LogIntercept.instances
        .forEach((instance: LogIntercept) => {
            modifiedMessage = (streamIdentifier === "out")
            ? instance.out(modifiedMessage)
            : instance.err(modifiedMessage);
        });

        return modifiedMessage;
    }

    private readonly outCallbacks: TInterceptCallback[] = [];
    private readonly errCallbacks: TInterceptCallback[] = [];

    constructor() {
        super();

        LogIntercept.instances.push(this);
    }

    private apply(message: string, interceptCallbacks: TInterceptCallback[]): string {
        let modifiedMessage: string = message;

        interceptCallbacks
        .forEach((interceptCallback: TInterceptCallback) => {
            modifiedMessage = interceptCallback(modifiedMessage)
        });

        return modifiedMessage;
    }

    public onOut(interceptCallback: TInterceptCallback): this {
        this.outCallbacks.push(interceptCallback);

        return this;
    }

    public onErr(interceptCallback: TInterceptCallback): this {
        this.errCallbacks.push(interceptCallback);
        
        return this;
    }

    public onBoth(interceptCallback: TInterceptCallback): this {
        this.onOut(interceptCallback);
        this.onErr(interceptCallback);

        return this;
    }

    public out(message: string) {
        return this.apply(message, this.outCallbacks);
    }

    public err(message: string) {
        return this.apply(message, this.errCallbacks);
    }
}