import { workerData } from "worker_threads";

import { AppConfig } from "../AppConfig";


export const APP_CONFIG = new AppConfig(workerData.workingDir);