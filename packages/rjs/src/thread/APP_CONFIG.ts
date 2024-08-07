import { workerData } from "worker_threads";

import { AppConfig } from "../config/AppConfig";


export const APP_CONFIG = new AppConfig(workerData.workingDirPath);