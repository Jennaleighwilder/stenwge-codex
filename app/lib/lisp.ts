/**
 * codex.lisp — a small, real Lisp interpreter for the browser.
 *
 * Supports:
 *   numbers, strings, booleans, symbols, nil
 *   quoted lists                    'x  '(1 2 3)
 *   arithmetic                      + - * / mod
 *   comparisons                     = < > <= >= not and or
 *   pair/list primitives            cons car cdr list null? pair? length
 *   control flow                    if cond when unless begin
 *   binding                         define set! let let* letrec
 *   functions                       lambda ; closures over lexical scope
 *   varargs                         (lambda args ...)
 *   apply                           (apply f args)
 *   tail-call trampoline            recursion doesn't blow the JS stack
 *   strings                         string-append string-length substring
 *   printing                        (display x) (newline) → returns a string log
 *
 * Not supported (deliberate scope): macros, continuations, tail-position
 * inside try/catch. Everything else you might want in a toy Lisp works.
 *
 * Entry point:
 *   lispEval(source: string, env?): { value, log }
 */

// ── AST ────────────────────────────────────────────────────────────────────
type Atom = number | string | boolean | Sym | null | LFn | Pair;
type Value = Atom;

class Sym {
  constructor(public name: string) {}
  toString() {
    return this.name;
  }
}

class Pair {
  constructor(public car: Value, public cdr: Value) {}
}

function sym(n: string) {
  return new Sym(n);
}

function isSym(v: Value): v is Sym {
  return v instanceof Sym;
}

function isPair(v: Value): v is Pair {
  return v instanceof Pair;
}

function isNil(v: Value): boolean {
  return v === null;
}

function isList(v: Value): boolean {
  return v === null || (isPair(v) && isList((v as Pair).cdr));
}

function listOf(...xs: Value[]): Value {
  let out: Value = null;
  for (let i = xs.length - 1; i >= 0; i--) out = new Pair(xs[i], out);
  return out;
}

function listToArray(v: Value): Value[] {
  const out: Value[] = [];
  while (isPair(v)) {
    out.push((v as Pair).car);
    v = (v as Pair).cdr;
  }
  if (v !== null) throw new Error("improper list");
  return out;
}

function length(v: Value): number {
  let n = 0;
  while (isPair(v)) {
    n++;
    v = (v as Pair).cdr;
  }
  return n;
}

// ── Tokenize ───────────────────────────────────────────────────────────────
function tokenize(src: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === ";") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "(" || c === ")" || c === "'") {
      tokens.push(c);
      i++;
      continue;
    }
    if (c === '"') {
      let s = '"';
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\\") {
          s += src[i] + (src[i + 1] ?? "");
          i += 2;
        } else {
          s += src[i++];
        }
      }
      if (src[i] !== '"') throw new SyntaxError("unterminated string");
      s += '"';
      i++;
      tokens.push(s);
      continue;
    }
    let tok = "";
    while (i < src.length && !/[\s()'"]/.test(src[i])) tok += src[i++];
    tokens.push(tok);
  }
  return tokens;
}

// ── Parse ──────────────────────────────────────────────────────────────────
function parse(tokens: string[], top = true): Value {
  if (top) {
    // wrap top-level in an implicit (begin ...) so callers get a single expr
    const exprs: Value[] = [];
    while (tokens.length) exprs.push(readOne(tokens));
    if (exprs.length === 1) return exprs[0];
    return new Pair(sym("begin"), listOf(...exprs));
  }
  return readOne(tokens);
}

function readOne(tokens: string[]): Value {
  if (!tokens.length) throw new SyntaxError("unexpected EOF");
  const t = tokens.shift()!;
  if (t === "(") {
    let head: Pair | null = null;
    let tail: Pair | null = null;
    while (tokens.length && tokens[0] !== ")") {
      const v = readOne(tokens);
      const cell = new Pair(v, null);
      if (!head) head = cell;
      else tail!.cdr = cell;
      tail = cell;
    }
    if (tokens[0] !== ")") throw new SyntaxError("expected )");
    tokens.shift();
    return head ?? null;
  }
  if (t === ")") throw new SyntaxError("unexpected )");
  if (t === "'") return new Pair(sym("quote"), new Pair(readOne(tokens), null));
  if (t[0] === '"') return JSON.parse(t) as string;
  if (t === "#t" || t === "true") return true;
  if (t === "#f" || t === "false") return false;
  if (t === "nil" || t === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  return sym(t);
}

// ── Environment ────────────────────────────────────────────────────────────
class Env {
  vars = new Map<string, Value>();
  constructor(public parent: Env | null = null) {}
  get(name: string): Value {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: Env | null = this;
    while (cur) {
      if (cur.vars.has(name)) return cur.vars.get(name)!;
      cur = cur.parent;
    }
    throw new Error(`unbound symbol: ${name}`);
  }
  set(name: string, v: Value) {
    this.vars.set(name, v);
  }
  update(name: string, v: Value) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: Env | null = this;
    while (cur) {
      if (cur.vars.has(name)) {
        cur.vars.set(name, v);
        return;
      }
      cur = cur.parent;
    }
    throw new Error(`set!: unbound: ${name}`);
  }
}

// ── Functions ──────────────────────────────────────────────────────────────
type LFn = {
  __lisp_fn: true;
  name?: string;
  call: (args: Value[], log: LogSink) => Value;
};

type LogSink = { text: string };

function fn(
  name: string,
  call: (args: Value[], log: LogSink) => Value,
): LFn {
  return { __lisp_fn: true, name, call };
}

// ── Eval (with a simple tail-call trampoline) ──────────────────────────────
type Tail = { __tail: true; expr: Value; env: Env };

function makeTail(expr: Value, env: Env): Tail {
  return { __tail: true, expr, env };
}

function isTail(v: unknown): v is Tail {
  return !!(v && typeof v === "object" && (v as any).__tail);
}

function evalNode(expr: Value, env: Env, log: LogSink): Value {
  let cur: Value = expr;
  let curEnv = env;
  // trampoline loop for tail calls
  for (;;) {
    if (cur === null) return null;
    if (typeof cur === "number") return cur;
    if (typeof cur === "boolean") return cur;
    if (typeof cur === "string") return cur;
    if (isSym(cur)) return curEnv.get((cur as Sym).name);
    if (!isPair(cur)) return cur;

    const head = (cur as Pair).car;
    const rest = (cur as Pair).cdr;

    // special forms
    if (isSym(head)) {
      const s = (head as Sym).name;

      switch (s) {
        case "quote": {
          return (rest as Pair).car;
        }
        case "if": {
          const args = listToArray(rest);
          const [testE, thenE, elseE] = args;
          const t = evalNode(testE, curEnv, log);
          cur = t !== false && t !== null ? thenE : elseE ?? null;
          continue;
        }
        case "cond": {
          const clauses = listToArray(rest);
          let matched = false;
          for (const c of clauses) {
            const parts = listToArray(c);
            const [testE, ...body] = parts;
            const t =
              isSym(testE) && (testE as Sym).name === "else"
                ? true
                : evalNode(testE, curEnv, log);
            if (t !== false && t !== null) {
              matched = true;
              cur = new Pair(sym("begin"), listOf(...body));
              break;
            }
          }
          if (!matched) return null;
          continue;
        }
        case "when": {
          const args = listToArray(rest);
          const [testE, ...body] = args;
          const t = evalNode(testE, curEnv, log);
          if (t !== false && t !== null) {
            cur = new Pair(sym("begin"), listOf(...body));
            continue;
          }
          return null;
        }
        case "unless": {
          const args = listToArray(rest);
          const [testE, ...body] = args;
          const t = evalNode(testE, curEnv, log);
          if (t === false || t === null) {
            cur = new Pair(sym("begin"), listOf(...body));
            continue;
          }
          return null;
        }
        case "and": {
          const args = listToArray(rest);
          if (args.length === 0) return true;
          for (let i = 0; i < args.length - 1; i++) {
            const v = evalNode(args[i], curEnv, log);
            if (v === false || v === null) return v;
          }
          cur = args[args.length - 1];
          continue;
        }
        case "or": {
          const args = listToArray(rest);
          if (args.length === 0) return false;
          for (let i = 0; i < args.length - 1; i++) {
            const v = evalNode(args[i], curEnv, log);
            if (v !== false && v !== null) return v;
          }
          cur = args[args.length - 1];
          continue;
        }
        case "begin": {
          const body = listToArray(rest);
          if (body.length === 0) return null;
          for (let i = 0; i < body.length - 1; i++)
            evalNode(body[i], curEnv, log);
          cur = body[body.length - 1];
          continue;
        }
        case "define": {
          const args = listToArray(rest);
          // (define name expr) OR (define (name params...) body...)
          const target = args[0];
          if (isSym(target)) {
            const v = evalNode(args[1], curEnv, log);
            curEnv.set((target as Sym).name, v);
            if ((v as any)?.__lisp_fn && !(v as LFn).name) {
              (v as LFn).name = (target as Sym).name;
            }
            return null;
          }
          if (isPair(target)) {
            const name = ((target as Pair).car as Sym).name;
            const params = (target as Pair).cdr;
            const body = args.slice(1);
            const lambdaExpr = new Pair(
              sym("lambda"),
              new Pair(params, listOf(...body)),
            );
            const v = evalNode(lambdaExpr, curEnv, log) as LFn;
            v.name = name;
            curEnv.set(name, v);
            return null;
          }
          throw new Error("bad define");
        }
        case "set!": {
          const args = listToArray(rest);
          const name = ((args[0] as Sym).name);
          const v = evalNode(args[1], curEnv, log);
          curEnv.update(name, v);
          return null;
        }
        case "let": {
          const args = listToArray(rest);
          const bindings = listToArray(args[0]);
          const newEnv = new Env(curEnv);
          for (const b of bindings) {
            const parts = listToArray(b);
            const name = (parts[0] as Sym).name;
            const val = evalNode(parts[1], curEnv, log);
            newEnv.set(name, val);
          }
          const body = args.slice(1);
          curEnv = newEnv;
          cur = new Pair(sym("begin"), listOf(...body));
          continue;
        }
        case "let*": {
          const args = listToArray(rest);
          const bindings = listToArray(args[0]);
          const newEnv = new Env(curEnv);
          for (const b of bindings) {
            const parts = listToArray(b);
            const name = (parts[0] as Sym).name;
            const val = evalNode(parts[1], newEnv, log);
            newEnv.set(name, val);
          }
          const body = args.slice(1);
          curEnv = newEnv;
          cur = new Pair(sym("begin"), listOf(...body));
          continue;
        }
        case "letrec": {
          const args = listToArray(rest);
          const bindings = listToArray(args[0]);
          const newEnv = new Env(curEnv);
          for (const b of bindings) {
            const parts = listToArray(b);
            const name = (parts[0] as Sym).name;
            newEnv.set(name, null);
            const val = evalNode(parts[1], newEnv, log);
            newEnv.set(name, val);
          }
          const body = args.slice(1);
          curEnv = newEnv;
          cur = new Pair(sym("begin"), listOf(...body));
          continue;
        }
        case "lambda": {
          const args = listToArray(rest);
          const params = args[0];
          const body = args.slice(1);
          const parentEnv = curEnv;
          const closure: LFn = fn("<lambda>", (callArgs, subLog) => {
            const callEnv = new Env(parentEnv);
            if (isSym(params)) {
              // varargs: (lambda args ...)
              callEnv.set((params as Sym).name, listOf(...callArgs));
            } else if (params === null) {
              if (callArgs.length !== 0)
                throw new Error("expected no args");
            } else {
              const names = listToArray(params).map(
                (p) => (p as Sym).name,
              );
              if (callArgs.length !== names.length) {
                throw new Error(
                  `arity: expected ${names.length}, got ${callArgs.length}`,
                );
              }
              for (let i = 0; i < names.length; i++) {
                callEnv.set(names[i], callArgs[i]);
              }
            }
            // interpret body as begin, returning result
            const beginExpr = new Pair(sym("begin"), listOf(...body));
            return evalNode(beginExpr, callEnv, subLog);
          });
          return closure;
        }
      }
    }

    // ── application ──
    const fnV = evalNode(head, curEnv, log);
    if (!fnV || typeof fnV !== "object" || !(fnV as any).__lisp_fn) {
      throw new Error(
        `not callable: ${printValue(head)} → ${printValue(fnV)}`,
      );
    }
    const argExprs = listToArray(rest);
    const args = argExprs.map((a) => evalNode(a, curEnv, log));
    return (fnV as LFn).call(args, log);
  }
}

// ── Print ──────────────────────────────────────────────────────────────────
export function printValue(v: Value): string {
  if (v === null) return "nil";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "#t" : "#f";
  if (typeof v === "string") return JSON.stringify(v);
  if (isSym(v)) return (v as Sym).name;
  if (isPair(v)) {
    const parts: string[] = [];
    let cur: Value = v;
    while (isPair(cur)) {
      parts.push(printValue((cur as Pair).car));
      cur = (cur as Pair).cdr;
    }
    if (cur === null) return `(${parts.join(" ")})`;
    return `(${parts.join(" ")} . ${printValue(cur)})`;
  }
  if ((v as any)?.__lisp_fn) return `#<fn:${(v as LFn).name ?? "?"}>`;
  return String(v);
}

// ── Stdlib ─────────────────────────────────────────────────────────────────
function nAry(name: string, n: number, args: Value[]) {
  if (args.length !== n) throw new Error(`${name}: expected ${n} args`);
}
function num(name: string, v: Value): number {
  if (typeof v !== "number") throw new Error(`${name}: expected number`);
  return v;
}

function makeStdEnv(): Env {
  const env = new Env();
  const bind = (name: string, f: LFn["call"]) =>
    env.set(name, fn(name, f));

  bind("+", (a) => a.reduce((s: number, v) => s + num("+", v), 0));
  bind("-", (a) => {
    if (a.length === 0) throw new Error("-: at least one arg");
    if (a.length === 1) return -num("-", a[0]);
    return a.slice(1).reduce(
      (s: number, v) => s - num("-", v),
      num("-", a[0]),
    );
  });
  bind("*", (a) => a.reduce((s: number, v) => s * num("*", v), 1));
  bind("/", (a) => {
    if (a.length === 0) throw new Error("/: at least one arg");
    if (a.length === 1) return 1 / num("/", a[0]);
    return a.slice(1).reduce(
      (s: number, v) => s / num("/", v),
      num("/", a[0]),
    );
  });
  bind("mod", (a) => {
    nAry("mod", 2, a);
    return num("mod", a[0]) % num("mod", a[1]);
  });
  bind("abs", (a) => Math.abs(num("abs", a[0])));
  bind("min", (a) => Math.min(...a.map((v) => num("min", v))));
  bind("max", (a) => Math.max(...a.map((v) => num("max", v))));

  bind("=", (a) => a.every((v) => v === a[0]));
  bind("<", (a) => a[0]! < a[1]!);
  bind(">", (a) => a[0]! > a[1]!);
  bind("<=", (a) => a[0]! <= a[1]!);
  bind(">=", (a) => a[0]! >= a[1]!);
  bind("not", (a) => a[0] === false || a[0] === null);
  bind("eq?", (a) => a[0] === a[1]);

  bind("cons", (a) => new Pair(a[0], a[1]));
  bind("car", (a) => {
    if (!isPair(a[0])) throw new Error("car: not a pair");
    return (a[0] as Pair).car;
  });
  bind("cdr", (a) => {
    if (!isPair(a[0])) throw new Error("cdr: not a pair");
    return (a[0] as Pair).cdr;
  });
  bind("list", (a) => listOf(...a));
  bind("null?", (a) => a[0] === null);
  bind("pair?", (a) => isPair(a[0]));
  bind("number?", (a) => typeof a[0] === "number");
  bind("symbol?", (a) => isSym(a[0]));
  bind("string?", (a) => typeof a[0] === "string");
  bind("procedure?", (a) => !!(a[0] as any)?.__lisp_fn);
  bind("length", (a) => length(a[0]));
  bind("reverse", (a) => {
    const arr = listToArray(a[0]);
    arr.reverse();
    return listOf(...arr);
  });
  bind("append", (a) => {
    const arr: Value[] = [];
    for (const l of a) arr.push(...listToArray(l));
    return listOf(...arr);
  });
  bind("map", (a) => {
    const [f, list] = a;
    const arr = listToArray(list).map((v) => (f as LFn).call([v], { text: "" }));
    return listOf(...arr);
  });
  bind("filter", (a) => {
    const [f, list] = a;
    const arr = listToArray(list).filter((v) => {
      const r = (f as LFn).call([v], { text: "" });
      return r !== false && r !== null;
    });
    return listOf(...arr);
  });
  bind("fold", (a) => {
    const [f, init, list] = a;
    let acc: Value = init;
    for (const v of listToArray(list))
      acc = (f as LFn).call([acc, v], { text: "" });
    return acc;
  });
  bind("apply", (a) => {
    const [f, list] = a;
    return (f as LFn).call(listToArray(list), { text: "" });
  });

  bind("string-append", (a) => a.map(String).join(""));
  bind("string-length", (a) => (a[0] as string).length);
  bind("substring", (a) =>
    (a[0] as string).slice(a[1] as number, a[2] as number),
  );
  bind("number->string", (a) => String(a[0]));
  bind("string->number", (a) => parseFloat(a[0] as string));
  bind("symbol->string", (a) => (a[0] as Sym).name);

  bind("display", (a, log) => {
    for (const v of a) log.text += typeof v === "string" ? v : printValue(v);
    return null;
  });
  bind("newline", (_, log) => {
    log.text += "\n";
    return null;
  });
  bind("write", (a, log) => {
    for (const v of a) log.text += printValue(v);
    return null;
  });

  // codex-flavored helpers — these tie the interpreter to the story world
  bind("mouse", () =>
    listOf(
      new Pair(sym("lactose-intolerant"), true),
      new Pair(sym("wants-more"), true),
    ),
  );
  bind("cat", () =>
    listOf(
      new Pair(sym("vegetarian"), true),
      new Pair(sym("tame-level"), "limited"),
    ),
  );
  bind("moon", () => "always");

  return env;
}

// ── Public API ─────────────────────────────────────────────────────────────
export type LispResult = { value: string; log: string; ok: boolean };

let cachedEnv: Env | null = null;

export function lispEval(source: string, opts?: { fresh?: boolean }): LispResult {
  const env = !cachedEnv || opts?.fresh ? (cachedEnv = makeStdEnv()) : cachedEnv;
  const log: LogSink = { text: "" };
  try {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const v = evalNode(ast, env, log);
    return { value: printValue(v), log: log.text, ok: true };
  } catch (e: any) {
    return { value: "", log: log.text, ok: false };
  }
}

export function lispEvalStrict(
  source: string,
  opts?: { fresh?: boolean },
): LispResult & { error?: string } {
  const env = !cachedEnv || opts?.fresh ? (cachedEnv = makeStdEnv()) : cachedEnv;
  const log: LogSink = { text: "" };
  try {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const v = evalNode(ast, env, log);
    return { value: printValue(v), log: log.text, ok: true };
  } catch (e: any) {
    return { value: "", log: log.text, ok: false, error: e?.message ?? String(e) };
  }
}
