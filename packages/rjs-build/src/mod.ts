import { type TPathMap, type TBuild, createBuild } from "./Build.js";

export { createBuild } from "./Build.js";

export async function build(srcDirPath?: string, pubDirPath?: string): Promise<TPathMap> {
  return (await createBuild(srcDirPath, pubDirPath))
    .build();
}

export async function emit(srcDirPath?: string, pubDirPath?: string): Promise<TPathMap> {
  const build: TBuild = await createBuild(srcDirPath, pubDirPath)

  await build.initEmit();

  return build.build(true);
}