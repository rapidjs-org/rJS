import { IS_DENO, IS_NODE } from "./constants.js";

export class RuntimeAdapter<Cb extends CallableFunction> {
  private interfaceCb?: Cb;

  constructor() {}

  public withNode(interfaceCb: Cb): this {
    if (!IS_NODE) return this;

    this.interfaceCb = interfaceCb;

    return this;
  }

  public withDeno(interfaceCb: Cb): this {
    if (!IS_DENO) return this;

    this.interfaceCb = interfaceCb;

    return this;
  }

  public compile(): Cb {
    if (!this.interfaceCb) throw new ReferenceError("Adapter not implemented");

    return this.interfaceCb;
  }
}
