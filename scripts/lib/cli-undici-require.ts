import type { Rolldown } from "vite-plus/pack";

const UNDICI_PROXY = "\0t3-cli-undici.cjs";

/** SEA can require disk packages but cannot resolve external ESM imports, including re-exports. */
export function cliUndiciRequirePlugin(): Rolldown.Plugin {
  return {
    name: "t3-cli-undici-require",
    resolveId(source, importer) {
      if (source !== "undici") return;
      return importer === UNDICI_PROXY
        ? { id: source, external: true }
        : { id: UNDICI_PROXY, external: false };
    },
    load(id) {
      if (id === UNDICI_PROXY) return 'module.exports = require("undici");';
    },
  };
}
