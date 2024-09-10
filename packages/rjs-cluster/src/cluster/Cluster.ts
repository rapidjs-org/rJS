import { join } from "path";

import { ProcessCluster } from "../process/ProcessCluster";
import { IAdapterConfiguration, IClusterOptions } from "../AWorkerCluster";


export class Cluster extends ProcessCluster {
	constructor(
		adapterConfig: IAdapterConfiguration,
		processClusterOptions?: Partial<IClusterOptions>,
		threadClusterOptions: Partial<IClusterOptions> = processClusterOptions) {
		super({
			modulePath: join(__dirname, "adapter.process"),
			options: {
				threadAdapterConfig: adapterConfig,
				threadClusterOptions: threadClusterOptions
			}
		}, processClusterOptions);
	}
}