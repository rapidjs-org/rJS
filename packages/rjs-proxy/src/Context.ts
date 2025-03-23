import { RateLimiter } from "./RateLimiter.ts";

export interface IContext {
  cwd: string;  // = app directory
  hostname: string;
  tls?: {
    certPath: string;
    keyPath: string;
  } // decides mode
}

export class Context implements IContext {
  private readonly rateLimiter: RateLimiter;
  private readonly processPool: ProcessPool;
}