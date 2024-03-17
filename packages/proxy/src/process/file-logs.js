import { join } from "path";
import { readdirSync, statfsSync, rmSync } from "fs";
import { existsSync, appendFile, mkdirSync } from "fs";
import { __config, LogIntercept } from "@rapidjs.org/shared";
// TODO: Not valid in proxy
const _config = {
    logFileRotationMemoryThreshold: 1000000000
};
const logDirPath = join(process.cwd(), __config.logsDirName);
!existsSync(logDirPath)
    && mkdirSync(logDirPath);
new LogIntercept()
    .on("write", (_, rawMessage) => {
    if (!rawMessage.trim().length)
        return;
    const nowDate = new Date();
    const wrapValue = (value) => {
        return value.toString().padStart(2, "0");
    };
    const date = [
        nowDate.getFullYear(), wrapValue(nowDate.getMonth()), wrapValue(nowDate.getDate())
    ].join("-");
    const time = [
        wrapValue(nowDate.getHours()), wrapValue(nowDate.getMinutes()), wrapValue(nowDate.getSeconds())
    ].join(":");
    const timePrefix = `[${time}]`;
    const logDirStats = statfsSync(logDirPath);
    const remainingBytes = logDirStats.bsize * logDirStats.bavail;
    if (remainingBytes <= _config.logFileRotationMemoryThreshold) {
        const oldestLogFile = readdirSync(logDirPath, {
            withFileTypes: true
        })
            .filter((dirent) => dirent.isFile())
            .sort((a, b) => {
            const enumerate = (dateName) => {
                var _a;
                return parseInt(((_a = dateName.match(/[0-9]+/g)) !== null && _a !== void 0 ? _a : []).join(""));
            };
            return enumerate(a.name) - enumerate(b.name);
        })
            .pop();
        if (!oldestLogFile)
            return;
        rmSync(join(logDirPath, oldestLogFile.name));
    }
    appendFile(join(logDirPath, `${date}.log`), `${timePrefix}\t${rawMessage
        .replace(/\n?$/g, "")
        .replace(/\n/g, `\n${Array.from({ length: timePrefix.length }, () => " ").join("")}\t`)}\n`, (err) => { });
});
