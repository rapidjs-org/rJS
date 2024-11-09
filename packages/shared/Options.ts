export class Options<T> {
	private static deepMerge(target: unknown, source: unknown): unknown {
		const isKeyObject = (obj: unknown) => {
			return typeof(obj) === "object"
			&& !!Object.entries(obj ?? {}).length
			&& !Array.isArray(obj);
		};
		
		if(!isKeyObject(target)) return source;

		const sourceObj = source as Record<string, unknown>;
		const targetObj = (!isKeyObject(target) ? {} : target) as Record<string, unknown>;
		for(const key in sourceObj) {
			if(sourceObj[key] === undefined) continue;
			
			targetObj[key] = isKeyObject(sourceObj[key])
			? Options.deepMerge(targetObj[key], sourceObj[key])
			: sourceObj[key];
		}
		return targetObj;
	};

	private obj: T;

	constructor(obj: Partial<T>, defaultsObj: T) {
		this.obj = Options.deepMerge(defaultsObj, obj) as T;
	}

	public get object(): T {
		return this.obj;
	}
}