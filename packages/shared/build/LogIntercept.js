import { EventEmitter } from "events";
import { AsyncMutex } from "./AsyncMutex";
const _config = {
    noFormatIndicatorRegex: /^==/
};
const logMutex = new AsyncMutex();
let lastMessagestamp;
process.stdout.write = bindWrite("out");
process.stderr.write = bindWrite("err");
function bindWrite(streamIdentifier) {
    const stream = (streamIdentifier === "out")
        ? process.stdout.write.bind(process.stdout)
        : process.stderr.write.bind(process.stderr);
    return (message, ...args) => {
        message = message.toString();
        if (!message.trim().length) {
            return stream(message, ...args);
        }
        logMutex.lock(() => {
            if (_config.noFormatIndicatorRegex.test(message)) {
                return stream(message.replace(_config.noFormatIndicatorRegex, ""), ...args);
            }
            const formattedMessage = message
                .replace(/#([a-z]+)\{([^}]*)\}/gi, (_, code, formatMessage) => {
                const ansii = {
                    "B": 1,
                    "I": 3,
                    "r": 31,
                    "g": 32,
                    "b": 36
                };
                return `${Array.from({ length: code.length }, (_, i) => {
                    var _a;
                    return `\x1b[${(_a = ansii[code.split("")[i]]) !== null && _a !== void 0 ? _a : 0}m`;
                }).join("")}${formatMessage}\x1b[0m`;
            })
                .replace(/(^| )([0-9]+(\.[0-9]+)?)([.,)} ]|$)/gi, "$1\x1b[33m$2\x1b[0m$4");
            const modifiedMessage = LogIntercept.applyAll(streamIdentifier, formattedMessage);
            if ((lastMessagestamp === null || lastMessagestamp === void 0 ? void 0 : lastMessagestamp.message) != message) {
                lastMessagestamp = {
                    message: formattedMessage,
                    count: 1
                };
                stream(modifiedMessage, ...args);
                const cleanMessage = (encodedMessage) => {
                    return encodedMessage
                        .replace(/\x1b\[\??[0-9]{1,2}([a-z]|(;[0-9]{3}){0,3}m)/gi, "");
                };
                LogIntercept.instances
                    .forEach((instance) => {
                    instance.emit("write", cleanMessage(modifiedMessage), cleanMessage(formattedMessage));
                });
                return true;
            }
            const createIndexer = () => (lastMessagestamp.count > 1)
                ? ` \x1b[2m\x1b[31m(${lastMessagestamp.count})\x1b[0m\n`
                : "";
            stream(`\x1b[1A${Array.from({ length: createIndexer().length }, () => "\b").join("")}`, () => {
                lastMessagestamp.count++;
                stream(`${modifiedMessage}`.replace(/(\n?)$/, createIndexer()), ...args);
            });
        });
        return true;
    };
}
// TODO: Split joined messages (?)
export class LogIntercept extends EventEmitter {
    static applyAll(streamIdentifier, message) {
        if (!message.trim().length)
            return message;
        let modifiedMessage = message;
        LogIntercept.instances
            .forEach((instance) => {
            modifiedMessage = (streamIdentifier === "out")
                ? instance.out(modifiedMessage)
                : instance.err(modifiedMessage);
        });
        return modifiedMessage;
    }
    constructor() {
        super();
        this.outCallbacks = [];
        this.errCallbacks = [];
        LogIntercept.instances.push(this);
    }
    apply(message, interceptCallbacks) {
        let modifiedMessage = message;
        interceptCallbacks
            .forEach((interceptCallback) => {
            modifiedMessage = interceptCallback(modifiedMessage);
        });
        return modifiedMessage;
    }
    onOut(interceptCallback) {
        this.outCallbacks.push(interceptCallback);
        return this;
    }
    onErr(interceptCallback) {
        this.errCallbacks.push(interceptCallback);
        return this;
    }
    onBoth(interceptCallback) {
        this.onOut(interceptCallback);
        this.onErr(interceptCallback);
        return this;
    }
    out(message) {
        return this.apply(message, this.outCallbacks);
    }
    err(message) {
        return this.apply(message, this.errCallbacks);
    }
}
LogIntercept.instances = [];
