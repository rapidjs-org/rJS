import { readdirSync, Dirent } from "fs";


export function activePorts(socketLocation: string): number[] {
	return readdirSync(socketLocation, {
		withFileTypes: true
	})
    .filter((dirent: Dirent) => dirent.isSocket())
    .filter((dirent: Dirent) => /^rjs__\d+\.sock$/.test(dirent.name))
    .map((dirent: Dirent) => parseInt(dirent.name.match(/\d+/)[0]))
}