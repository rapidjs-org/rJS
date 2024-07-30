export class Args {
	private static readonly raw: string[] = process.argv.slice(2);

	private static retrieveKeyIndex(name: string, shorthand?: string): number {
		return Math.max(
			Args.raw.indexOf(`--${name.toLowerCase()}`),
			shorthand ? Args.raw.indexOf(`-${shorthand.toUpperCase()}`) : -1
		);
	}

	public static parsePositional(index = 0): string {
		for (let i = 0; i < index; i++) {
			if (/^-/.test(Args.raw[index])) return;
		}
		return Args.raw[index];
	}

	public static parseFlag(key: string, shorthand?: string): boolean {
		return Args.retrieveKeyIndex(key, shorthand) >= 0;
	}

	public static parseOption(key: string, shorthand?: string): string {
		const index: number = Args.retrieveKeyIndex(key, shorthand);
		return ~index ? Args.raw[index + 1] : null;
	}
}