import { join } from "path";
import { StatsFs, Dirent, readdirSync, statfsSync, rmSync } from "fs";
import { existsSync, appendFile, mkdirSync } from "fs";

import { LogIntercept } from "../common/LogIntercept";

import __config from "../__config.json";


const _config = {
    logFileRotationMemoryThreshold: 1000000000
};


const logDirPath = join(process.cwd(), __config.logsDirName);

!existsSync(logDirPath)
&& mkdirSync(logDirPath);


function formatMarkSyntax(message: string, formatter: (code: string, formatMessage: string) => string): string {
    return message
    .replace(/#([a-z]+)\{([^}]*)\}/i, (_, code: string, formatMessage: string) => {
        return formatter(code, formatMessage);
    })
}


new LogIntercept()
.onOut((message: string) => {
	const modifiedMessage: string = formatMarkSyntax(message, (code: string, formattedMessage: string) => {
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
    })
    .replace(/(^| )([0-9]+(\.[0-9]+)?)([.)} ]|$)/gi, "$1\x1b[33m$2\x1b[0m$4");

	return modifiedMessage;
})
.on("write", (_, rawMessage: string) => {
    const cleanMessage: string = formatMarkSyntax(rawMessage, (_, formatMessage: string) => formatMessage)
    .replace(/\x1b\[\??[0-9]{1,2}([a-z]|(;[0-9]{3}){0,3}m)/gi, "")
    .trim();
    
    if(!cleanMessage.length) return;

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
    
    const timePrefix: string = `[${time}]`;

    const logDirStats: StatsFs = statfsSync(logDirPath);
    const remainingBytes: number = logDirStats.bsize * logDirStats.bavail;

    if(remainingBytes <= _config.logFileRotationMemoryThreshold) {
        const oldestLogFile: Dirent = readdirSync(logDirPath, {
            withFileTypes: true
        })
        .filter((dirent: Dirent) => dirent.isFile())
        .sort((a: Dirent, b: Dirent) => {
            const enumerate = (dateName: string): number => {
                return parseInt((dateName.match(/[0-9]+/g) ?? []).join(""));
            };
            return enumerate(a.name) - enumerate(b.name);
        })
        .pop();

        if(!oldestLogFile) return;

        rmSync(join(logDirPath, oldestLogFile.name))
    }

	appendFile(join(logDirPath, `${date}.log`), `${timePrefix}\t${
		cleanMessage
        .replace(/\n?$/g, "")
        .replace(/\n/g, `\n${Array.from({ length: timePrefix.length }, () => " ").join("")}\t`)
	}\n`, (err: Error) => {});
});