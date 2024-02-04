import { join } from "path";
import { StatsFs, Dirent, readdirSync, statfsSync, rmSync } from "fs";
import { existsSync, appendFile, mkdirSync } from "fs";

import { LogIntercept } from "../common/LogIntercept";

import __config from "../__config.json";


// TODO: Not valid in proxy


const _config = {
    logFileRotationMemoryThreshold: 1000000000
};


const logDirPath = join(process.cwd(), __config.logsDirName);

!existsSync(logDirPath)
&& mkdirSync(logDirPath);


new LogIntercept()
.on("write", (_, rawMessage: string) => {
    if(!rawMessage.trim().length) return;

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
		rawMessage
        .replace(/\n?$/g, "")
        .replace(/\n/g, `\n${Array.from({ length: timePrefix.length }, () => " ").join("")}\t`)
	}\n`, (err: Error) => {});
});