import { http } from "@rapidjs.org/adapters";

const registry = null;

enum EMode {
  HTTP, HTTPS
}

export type TProxyOptions = {
  portHttp: number;
  portHttps: number;
};

function handle(mode: EMode, req: http.TRequest): http.TResponse {

}

export async function init(options: Partial<TProxyOptions> = {}): Promise<void> {
  const optionsWithDefaults: TProxyOptions = {
    portHttp: 80,
    portHttps: 443,

    ...options
  };

  // HTTP server
  const serveHttp: Promise<void> = http.serve({
    port: optionsWithDefaults.portHttp
  }, (req: http.TRequest) => handle(EMode.HTTP, req));

  // HTTPS server
  const serveHttps: Promise<void> = await http.serve({
    // TODO: TLS here with SNI
    port: optionsWithDefaults.portHttps
  }, (req: http.TRequest) => handle(EMode.HTTPS, req));

  await Promise.all([ serveHttp, serveHttps ]);
}

export function register(context: TContext) {

}