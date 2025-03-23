import { cwd, http } from "@rapidjs.org/adapters";
import { handle } from "@rapidjs.org/handler";

export async function serve(port: number = 0, cwd: string = cwd()): Promise<number> {
  await http.serve({
    port
  }, handle); // TODO: Only localhost

  return port;
}
