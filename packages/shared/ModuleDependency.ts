export class ModuleDependency<T> {
	private static async importDynamically<T>(reference: string): Promise<T> {
		let resolvedReference: string;
		try {
			resolvedReference = require.resolve(reference);
		} catch {
			return null;
		}

		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		return (await new Function(`return import("${resolvedReference}")`)()) as T;
	}

    private readonly path: string;
	
    constructor(path: string) {
        this.path = path;
    }

    public async import(): Promise<T>{
		delete require.cache[require.resolve(this.path)];
		
		const buildInterface = await ModuleDependency.importDynamically<{
			default: T|Promise<T>;
		}>(this.path);
		const resolvedBuildInterface = (buildInterface ?? {}).default ?? buildInterface as unknown as T|Promise<T>;
		return await (
			!(resolvedBuildInterface instanceof Promise)
				? Promise.resolve(resolvedBuildInterface)
				: resolvedBuildInterface
		);
	}
}