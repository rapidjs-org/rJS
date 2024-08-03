import { EventEmitter } from "events";


export class Dependency extends EventEmitter {
	packageReference: string;

	constructor(packageReference: string, majorVersion?: number) {
		super();
		
		this.packageReference = packageReference;
	}

	installIfNotPresent(): Promise<this> {
		return new Promise((resolve, reject) => {
			// TODO: Prompt
			
			resolve(this);
		});
	}

	require<T>(): Promise<T> {
		return import(this.packageReference);
	}
}