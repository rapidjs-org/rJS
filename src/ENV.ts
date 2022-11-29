import { ISpaceEnv } from "./interfaces";


export const ENV: ISpaceEnv = {
    MODE: JSON.parse(process.env.MODE),
    PATH: process.env.PATH
};

// TODO: Handle parsing errors