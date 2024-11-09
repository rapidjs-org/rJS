import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

export class LocalEnv {
    private readonly rootDirPath: string;
    private readonly identifiers: Map<string, string>;

    constructor(dev: boolean = false, rootDirPath: string = process.cwd()) {
        this.rootDirPath = rootDirPath;

        this.identifiers = new Map([
            ...this.parseFile(".env"),
            ...this.parseFile(`.env.${dev ? "development" : "production"}`)
        ]);
    }

    private parseFile(name: string): Map<string, string> {
        const path: string = resolve(this.rootDirPath, name);
        if (!existsSync(path)) return new Map();

        return new Map(
            readFileSync(path)
                .toString()
                .split(/\n/g)
                .filter((line: string) =>
                    /^[A-Z][A-Z0-9_]* *= *.*$/.test(line.trim())
                )
                .map((line: string) => [
                    line.slice(0, line.indexOf("=")).trim(),
                    line.slice(line.indexOf("=") + 1).trim()
                ])
        );
    }

    public read(identifier: string): string | undefined {
        return this.identifiers.get(identifier);
    }
}
