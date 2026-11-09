// @effect-diagnostics nodeBuiltinImport:off -- Exercises emitted bundler output through Node's module loader.
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { assert, it } from "vite-plus/test";
import { build } from "vite-plus/pack";
import { findEsmImportsOfExternalPackages } from "./cli-executable-imports.ts";
import { cliUndiciRequirePlugin } from "./cli-undici-require.ts";

it("loads static, re-exported and dynamic Undici APIs without external ESM imports", async () => {
  const serverDir = NodeURL.fileURLToPath(new URL("../../apps/server/", import.meta.url));
  const dir = await NodeFSP.mkdtemp(NodePath.join(serverDir, ".cli-undici-test-"));
  try {
    const result = await build({
      config: false,
      entry: ["virtual:undici-probe"],
      write: false,
      format: "esm",
      platform: "node",
      deps: { alwaysBundle: () => true, neverBundle: () => false },
      plugins: [
        {
          name: "undici-probe",
          resolveId(id) {
            if (id === "virtual:undici-probe") return "\0undici-probe.ts";
            if (id === "virtual:undici-exports") return "\0undici-exports.ts";
          },
          load(id) {
            if (id === "\0undici-probe.ts") {
              return `import { Agent } from "undici";
                import { FormData } from "virtual:undici-exports";
                export const staticApi = typeof Agent;
                export const reexportApi = typeof FormData;
                export const dynamicApi = async () => typeof (await import("undici")).Agent;`;
            }
            if (id === "\0undici-exports.ts") return 'export * from "undici";';
          },
        },
        cliUndiciRequirePlugin(),
      ],
    });
    const chunk = result.bundles[0]?.chunks.find((chunk) => chunk.type === "chunk");
    assert.isDefined(chunk);
    assert.deepStrictEqual(findEsmImportsOfExternalPackages(chunk.code), []);
    const output = NodePath.join(dir, "probe.mjs");
    await NodeFSP.writeFile(output, chunk.code);
    const probe = await import(NodeURL.pathToFileURL(output).href);
    assert.strictEqual(probe.staticApi, "function");
    assert.strictEqual(probe.reexportApi, "function");
    assert.strictEqual(await probe.dynamicApi(), "function");
  } finally {
    await NodeFSP.rm(dir, { recursive: true, force: true });
  }
});
