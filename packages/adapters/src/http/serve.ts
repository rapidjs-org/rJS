// deno-lint-ignore-file
// @ts-nocheck

import type { IncomingMessage, ServerResponse } from "node:http";

import { RuntimeAdapter } from "../RuntimeAdapter.js";
import { readFile } from "../fs/readFile.js";
import { resolve } from "../path/resolve.js";

type THeaders = {
  [ key: string ]: string|string[];
};

export type TServerOptions = {
  port: number;
  tls?: {
    certPath: string;
    keyPath: string;
  }
};

export type TRequest = {
  body: () => Promise<string>;
  headers: THeaders;
  method: string;
  url: URL;
};

export type TResponse = {
  headers: THeaders;
  status: number;
  body?: string;
};

function compileOptions(options: Partial<TServerOptions>): TServerOptions {
  const optionsWithDefaults: TServerOptions = {
    port: options.tls ? 443 : 80,
    
    ...options
  };

  return {
    port: optionsWithDefaults.port,
    ...optionsWithDefaults.tls
      ? {
        cert: readFile(resolve(optionsWithDefaults.tls?.certPath)),
        key: readFile(resolve(optionsWithDefaults.tls?.keyPath))
      }
      : {}
  };
}

function compileRequest(req: IncomingMessage|Request, config?: {
  isSecure: boolean;
  port: number;
}): Omit<TRequest, "body"> {
  const headers: THeaders = Object.fromEntries(Object.entries(req.headers));

  return {
    headers,
    method: (req.method ?? "GET").toUpperCase(),
    url: new URL(config
      ? `http${config.isSecure ? "s" : ""}://${headers["host"] || `localhost:${config.port}`}${req.url}`
      : req.url
    )
  };
}

function compileResponse(res: Partial<TResponse>): TResponse {
  return {
    status: 200,
    headers: {},

    ...res
  }
}

export const serve = new RuntimeAdapter<
  (options: TServerOptions, requestListener: (req?: TRequest) => Partial<TResponse>) => Promise<void>
>()
  .withNode(async (options: TServerOptions, requestListener: (req?: TRequest) => Partial<TResponse> = () => ({})) => {
    const { STATUS_CODES } = await import("node:http");
    const { createServer } = await import(`node:http${options.tls ? "s" : ""}`);
    
    return new Promise((resolve) => {
      const compiledOptions: TServerOptions = compileOptions(options);
      
      createServer(compiledOptions, async (req: IncomingMessage, res: ServerResponse) => {
        const uniformReq: Omit<TRequest, "body"> = compileRequest(req, {
          isSecure: !!compiledOptions.tls,
          port: compiledOptions.port
        });
        const uniformRes: TResponse = compileResponse(
          await requestListener({
            body: () => {
              return new Promise((resolve, reject) => {
                const body: string[] = [];
                req.on("readable", (chunk: string) => {
                  body.push(chunk);
                });
                req.on("end", () => {
                  resolve(body.join(""));
                });
                req.on("error", (err: Error) => {
                  reject(err);
                });
              });
            },
            headers: uniformReq.headers,
            method: uniformReq.method,
            url: uniformReq.url
          })
        );

        res.writeHead(uniformRes.status, STATUS_CODES[uniformRes.status], uniformRes.headers);
        res.write(uniformRes.body);
        res.end();
      })
        .listen(compiledOptions.port, resolve);
    });
  })
  .withDeno(async (options: TServerOptions, requestListener: (req?: TRequest) => Partial<TResponse> = () => ({})) => {
    Deno.serve(compileOptions(options), async (req: Request) => {
      const uniformReq: Omit<TRequest, "body"> = compileRequest(req);
      const uniformRes: TResponse = compileResponse(
        await requestListener({
          body: () => req.body?.text(),

          ...uniformReq
        })
      );

      return new Response(uniformRes.body, {
        status: uniformRes.status,
        headers: uniformRes.headers
      });
    });
  })
  .compile();
