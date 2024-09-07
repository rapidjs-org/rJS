export class Options<T> {
	private obj: T;

	constructor(obj: Partial<T>, defaultsObj: T) {
		this.obj = {
			...defaultsObj,
			...Object.fromEntries(
				Object.entries(obj)
				.filter((value: [ string, unknown ]) => (value[1] !== undefined))
			)
		};
	}	// TODO: Deep merge

	public get object(): T {
		return this.obj;
	}
}