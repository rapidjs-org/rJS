// @ts-nocheck: mixed runtime globals

export const IS_DENO = (() => {
  try {
    Deno;
    return true;
  } catch {
    return false;
  }
})();

export const IS_NODE = !IS_DENO;
