import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { INJECT_LAST, CHAIN_RULES } from "../src/chain.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_FILE = path.resolve(__dirname, "../src/chain.generated.d.ts");

// helper to sanitize keys
const isValidId = (k) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);

async function main() {
  // Load modules and compute the method name unions (skip non-functions)
  const ruleData = [];
  for (const r of CHAIN_RULES) {
    const abs = path.resolve(__dirname, "../src", r.path);
    const mod = await import(pathToFileURL(abs).href);

    const keys = Object.keys(mod)
      .filter((k) => typeof mod[k] === "function")
      .filter((k) => !k.startsWith("_"))
      .filter((k) => !r.skip?.has(k))
      .filter((k) => isValidId(k)); // only generate dot-callable names

    ruleData.push({ ...r, keys });
  }

  const injectLast = [...INJECT_LAST].filter(isValidId);

  // Emit a d.ts using mapped types so TS keeps the real Parameters/ReturnType.
  const lines = [];
  lines.push(`// AUTO-GENERATED FILE. DO NOT EDIT.`);
  lines.push(`// Run: node scripts/generate-chain-types.mjs`);
  lines.push(``);
  lines.push(`import type { Chain as BaseChain } from "./chain.js";`);

  for (const r of ruleData) {
    // Import module types
    const importPath = r.path.replace(/^\.\//, "./");
    lines.push(`import type * as ${r.ns} from "${importPath}";`);
  }

  lines.push(``);
  lines.push(`type InjectLastNames = ${injectLast.length ? injectLast.map((s) => JSON.stringify(s)).join(" | ") : "never"};`);
  lines.push(`type DropFirst<T extends any[]> = T extends [any, ...infer R] ? R : never;`);
  lines.push(`type DropLast<T extends any[]> = T extends [...infer R, any] ? R : never;`);
  lines.push(`type ParamsFirst<F> = F extends (...a: infer A) => any ? DropFirst<A> : never;`);
  lines.push(`type ParamsLast<F>  = F extends (...a: infer A) => any ? DropLast<A> : never;`);
  lines.push(`type Ret<F> = F extends (...a: any[]) => infer R ? R : never;`);
  lines.push(``);
  lines.push(`type ChainifyFirst<M> = {`);
  lines.push(`  [K in keyof M as K extends string ? K : never]: (...args: ParamsFirst<M[K]>) => BaseChain<Ret<M[K]>>;`);
  lines.push(`};`);
  lines.push(`type ChainifyLast<M> = {`);
  lines.push(`  [K in keyof M as K extends string ? K : never]: (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>>;`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`type Chainify<M, DefaultInject extends "first" | "last"> = {`);
  lines.push(`  [K in keyof M as K extends string ? K : never]:`);
  lines.push(`    K extends InjectLastNames`);
  lines.push(`      ? (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>>`);
  lines.push(`      : (DefaultInject extends "first" ? (...args: ParamsFirst<M[K]>) => BaseChain<Ret<M[K]>> : (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>>);`);
  lines.push(`};`);
  lines.push(``);

  // Build the combined interface augmentation for Chain
  lines.push(`declare module "./chain.js" {`);
  lines.push(`  interface Chain<T>`);
  lines.push(`    extends`);

  const parts = [];
  for (const r of ruleData) {
    if (!r.keys.length) continue;
    // Make a Pick<> type of only keys we generated to keep it small & accurate
    const keysUnion = r.keys.map((k) => JSON.stringify(k)).join(" | ");
    parts.push(`      Chainify<Pick<typeof ${r.ns}, ${keysUnion}>, ${JSON.stringify(r.defaultInject)}>`);

  }
  if (parts.length === 0) {
    lines.push(`    BaseChain<T> {}`);
  } else {
    lines.push(parts.join(",\n"));
    lines.push(`  {`);
    lines.push(`    /** Alias for array foreach (maps to A.foreach_) */`);
    lines.push(`    foreach(callback: (v: any, k: any) => any): BaseChain<any>;`);
    lines.push(`  }`);
  }
  lines.push(`}`);
  lines.push(``);

  await fs.writeFile(OUT_FILE, lines.join("\n"), "utf8");
  console.log(`Generated: ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
