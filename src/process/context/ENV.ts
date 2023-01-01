import { ISpaceEnv } from "../../interfaces";


export const ENV: ISpaceEnv = {
    MODE: JSON.parse(process.env.MODE),
    PATH: process.env.PATH
};  // TODO: Get all (+config)

// TODO: Handle parsing errors