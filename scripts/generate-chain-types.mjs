import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { INJECT_LAST, CHAIN_RULES, CHAIN_INJECTION } from "../src/chain.config.js";

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

  // Build injection-position name unions from CHAIN_INJECTION
  /** @type {Record<string, number>} */
  const inj = {};
  for (const [k, v] of Object.entries(CHAIN_INJECTION ?? {})) {
    if (!isValidId(k)) continue;
    const idx = Number(v?.inject);
    if (Number.isFinite(idx)) inj[k] = idx;
  }

  const inj0 = Object.keys(inj).filter((k) => inj[k] === 0);
  const inj1 = Object.keys(inj).filter((k) => inj[k] === 1);
  const inj2 = Object.keys(inj).filter((k) => inj[k] === 2);
  const injLast = Object.keys(inj).filter((k) => inj[k] === -1);

  // Emit a d.ts using mapped types so TS keeps the real Parameters/ReturnType.
  const lines = [];
  lines.push(`// AUTO-GENERATED FILE. DO NOT EDIT.`);
  lines.push(`// Run: node scripts/generate-chain-types.mjs`);
  lines.push(``);
  lines.push(`import type { Chain as BaseChain } from "./chain.js";`);

  for (const r of ruleData) {
    const importPath = r.path.replace(/^\.\//, "./");
    lines.push(`import type * as ${r.ns} from "${importPath}";`);
  }

  lines.push(``);
  lines.push(`type InjectLastNames = ${injectLast.length ? injectLast.map((s) => JSON.stringify(s)).join(" | ") : "never"};`);
  lines.push(`type Inject0Names = ${inj0.length ? inj0.map((s) => JSON.stringify(s)).join(" | ") : "never"};`);
  lines.push(`type Inject1Names = ${inj1.length ? inj1.map((s) => JSON.stringify(s)).join(" | ") : "never"};`);
  lines.push(`type Inject2Names = ${inj2.length ? inj2.map((s) => JSON.stringify(s)).join(" | ") : "never"};`);
  lines.push(`type InjectNeg1Names = ${injLast.length ? injLast.map((s) => JSON.stringify(s)).join(" | ") : "never"};`);

  lines.push(`type DropFirst<T extends any[]> = T extends [any, ...infer R] ? R : never;`);
  lines.push(`type DropLast<T extends any[]> = T extends [...infer R, any] ? R : never;`);
  lines.push(`type DropAt1<T extends any[]> = T extends [any, any, ...infer R] ? [T[0], ...R] : never;`);
  lines.push(`type DropAt2<T extends any[]> = T extends [any, any, any, ...infer R] ? [T[0], T[1], ...R] : never;`);

  lines.push(`type ParamsFirst<F> = F extends (...a: infer A) => any ? DropFirst<A> : never;`);
  lines.push(`type ParamsLast<F>  = F extends (...a: infer A) => any ? DropLast<A> : never;`);
  lines.push(`type ParamsAt1<F>   = F extends (...a: infer A) => any ? DropAt1<A> : never;`);
  lines.push(`type ParamsAt2<F>   = F extends (...a: infer A) => any ? DropAt2<A> : never;`);
  lines.push(`type Ret<F> = F extends (...a: any[]) => infer R ? R : never;`);
  lines.push(``);

  lines.push(`type Chainify<M, DefaultInject extends "first" | "last"> = {`);
  lines.push(`  [K in keyof M as K extends string ? K : never]:`);
  lines.push(`    // Positional injection overrides from CHAIN_INJECTION`);
  lines.push(`    K extends InjectNeg1Names ? (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>> :`);
  lines.push(`    K extends Inject2Names    ? (...args: ParamsAt2<M[K]>)  => BaseChain<Ret<M[K]>> :`);
  lines.push(`    K extends Inject1Names    ? (...args: ParamsAt1<M[K]>)  => BaseChain<Ret<M[K]>> :`);
  lines.push(`    K extends Inject0Names    ? (...args: ParamsFirst<M[K]>)=> BaseChain<Ret<M[K]>> :`);
  lines.push(`    // Simple last-injection list override`);
  lines.push(`    K extends InjectLastNames ? (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>> :`);
  lines.push(`    // Default module injection`);
  lines.push(`    (DefaultInject extends "first" ? (...args: ParamsFirst<M[K]>) => BaseChain<Ret<M[K]>> : (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>>);`);
  lines.push(`};`);
  lines.push(``);

  // Build the combined interface augmentation for Chain
  lines.push(`declare module "./chain.js" {`);
  lines.push(`  interface Chain<T>`);
  lines.push(`    extends`);

  const parts = [];
  for (const r of ruleData) {
    if (!r.keys.length) continue;
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
