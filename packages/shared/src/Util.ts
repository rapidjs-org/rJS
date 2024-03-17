export class Util {
	public static isUnixBasedOS: boolean = (process.platform !== "win32");  // Optimistic
}