import { readFileSync } from "fs";
import { resolve } from "path";

import { TJSON } from "../types";

import _config from "../_config.json";


export class Config {
    public static app = new Config();

    private readonly obj: TJSON;

    constructor(specifier?: string) {
        this.obj = JSON.parse(readFileSync(resolve(`${_config.configNameSuffix}.json`)).toString());
    }
}