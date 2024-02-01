import { join } from "path";
import { existsSync, appendFile, mkdirSync } from "fs";

import { LogIntercept } from "../common/LogIntercept";

import __config from "../__config.json";


const logDirPath = join(process.cwd(), __config.logsDirName);

!existsSync(logDirPath)
&& mkdirSync(logDirPath);

new LogIntercept((message: string) => {
	if(!message.trim().length) return message;

	const modifiedMessage: string = message
    .replace(/(^|[^a-z])([0-9]+(\.[0-9]+)?)([^a-z]|$)/g, "$1\x1b[33m$2\x1b[0m$4")
    .replace(/#([a-z]+)\{([^}]*)\}/i, (_, code: string, formattedMessage: string) => {
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
        }${formattedMessage}\x1b[0m`;
    });

	return modifiedMessage;
})
.on("write", (_, rawMessage: string) => {
    const nowDate: Date = new Date();
    const wrapValue = (value: unknown): string => {
        return value.toString().padStart(2, "0");
    };
    const date: string = [
        nowDate.getFullYear(), wrapValue(nowDate.getMonth()), wrapValue(nowDate.getDate())
    ].join("-");
	const time: string = [
        wrapValue(nowDate.getHours()), wrapValue(nowDate.getMinutes()), wrapValue(nowDate.getSeconds())
    ].join(":");

	appendFile(join(logDirPath, `${date}.log`), `[${time}]\t${
		rawMessage.replace(/\n?$/, "\n")
	}`, (err: Error) => {});
});