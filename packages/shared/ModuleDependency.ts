export class ModuleDependency<T> {
    private readonly path: string;

    constructor(path: string) {
        this.path = path;
    }

    public async import(): Promise<T>{
		delete require.cache[this.path];
		
		const buildInterface = (await import(this.path)) as { default: T|Promise<T>; };
		const resolvedBuildInterface = (buildInterface ?? {}).default ?? buildInterface as unknown as T|Promise<T>;
		return await (
			!(resolvedBuildInterface instanceof Promise)
				? Promise.resolve(resolvedBuildInterface)
				: resolvedBuildInterface
		);
	}
}