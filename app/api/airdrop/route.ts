import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/airdrop — a standalone offline copy of the codex, in a single HTML file.
 *
 * We synthesize an HTML document that contains:
 *   - the whole story text (7 chapters, kicker + line + subtitle)
 *   - a working brainfuck interpreter (JS, small)
 *   - a working mini-lisp (a tiny subset — 60 lines)
 *   - keyboard nav, dark theme, no external assets
 *
 * The intent isn't fidelity — it's that the codex is small enough to hand
 * someone as a .html file. Portable variance.
 */

const CHAPTERS = [
  { k: "spec", line: "if you give a mouse a cookie.", sub: "clean input. clean output. the system is well-specified." },
  { k: "bug", line: "but the mouse is lactose intolerant.", sub: "the system meets a constraint it was never designed to handle." },
  { k: "dup bug", line: "and the cat is a vegetarian.", sub: "now there are two characters refusing their own contract." },
  { k: "patch", line: "so the milk goes to the cat. the cookie stays with the mouse.", sub: "the system invents the behaviour the engineers never wrote — for the cause." },
  { k: "prod", line: "they run, the rest of their lives, in a worn boot under the moon.", sub: "this is what AI tools do when held by someone who is gently strange." },
  { k: "root cause", line: "you are the strange input. you are the variance.", sub: "the system needed your wrong questions to become what it became." },
  { k: "commit", line: 'git commit -m "the tale persists"', sub: "the forgotten code research institute will be here when you write the next one." },
];

export async function GET() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>the forgotten code research institute · offline codex</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #0a0908; color: #d6d3d1;
    min-height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 40px 20px;
  }
  .card {
    max-width: 720px; width: 100%;
    border: 1px solid #292524; border-radius: 6px;
    background: #12100e;
    padding: 40px;
  }
  .kicker { font-size: 10px; letter-spacing: 0.35em; text-transform: uppercase; color: #78716c; margin-bottom: 12px; }
  h1 { font-family: Georgia, "Cormorant Garamond", serif; font-style: italic; font-size: 32px; margin: 0 0 8px; color: #f5f5f4; font-weight: 500; }
  h1 small { color: #78716c; font-family: ui-monospace, monospace; font-style: normal; font-size: 12px; font-weight: normal; letter-spacing: 0.2em; text-transform: uppercase; display: block; margin-top: 8px; }
  .line { font-family: Georgia, "Cormorant Garamond", serif; font-style: italic; font-size: 28px; line-height: 1.35; color: #f5f5f4; margin: 24px 0 12px; }
  .sub  { font-family: Georgia, serif; font-style: italic; color: #a8a29e; font-size: 17px; line-height: 1.55; }
  .nav { display: flex; gap: 12px; margin-top: 32px; align-items: center; }
  .nav button {
    background: #1c1917; border: 1px solid #44403c; color: #d6d3d1; padding: 8px 14px; border-radius: 4px;
    cursor: pointer; font: inherit; font-size: 12px;
  }
  .nav button:hover { border-color: #f4dca3; color: #f4dca3; }
  .nav .fill { flex: 1; }
  .idx { color: #78716c; font-size: 11px; letter-spacing: 0.2em; }
  .repl { margin-top: 32px; border-top: 1px solid #292524; padding-top: 20px; }
  .repl .lbl { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #78716c; margin-bottom: 8px; }
  .repl textarea {
    width: 100%; background: #0a0908; border: 1px solid #292524; color: #d6d3d1;
    padding: 10px; border-radius: 4px; font: inherit; font-size: 12px; min-height: 70px; resize: vertical;
  }
  .repl .row { display: flex; gap: 8px; margin-top: 8px; align-items: center; }
  .repl .row button {
    background: #f4dca3; color: #0a0908; border: 0; padding: 6px 14px; border-radius: 3px; font: inherit; font-size: 11px; cursor: pointer;
  }
  .repl pre {
    background: #0a0908; border: 1px solid #292524; padding: 10px; border-radius: 4px;
    margin-top: 8px; min-height: 40px; font-size: 12px; white-space: pre-wrap; word-break: break-word;
    color: #86efac;
  }
  .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #57534e; letter-spacing: 0.2em; text-transform: uppercase; }
</style>
</head>
<body>
<div class="card">
  <div class="kicker">the forgotten code research institute · offline airdrop</div>
  <h1>a small strange thing, made with you.
    <small id="ch-kicker">${CHAPTERS[0].k}</small>
  </h1>
  <div class="line" id="ch-line">${CHAPTERS[0].line}</div>
  <div class="sub" id="ch-sub">${CHAPTERS[0].sub}</div>
  <div class="nav">
    <button id="prev">←</button>
    <button id="next">→</button>
    <span class="fill"></span>
    <span class="idx" id="idx">1 / ${CHAPTERS.length}</span>
  </div>

  <div class="repl">
    <div class="lbl">brainfuck (works offline)</div>
    <textarea id="bf">++++++++[>+++++++++<-]>.</textarea>
    <div class="row">
      <button id="runbf">run</button>
      <span style="color:#78716c;font-size:10px">→ prints "Y"</span>
    </div>
    <pre id="bfout"></pre>
  </div>

  <div class="repl">
    <div class="lbl">mini-lisp (works offline)</div>
    <textarea id="lisp">(define (fac n) (if (< n 2) 1 (* n (fac (- n 1))))) (fac 10)</textarea>
    <div class="row">
      <button id="runlisp">eval</button>
      <span style="color:#78716c;font-size:10px">→ 3628800</span>
    </div>
    <pre id="lispout"></pre>
  </div>
</div>

<div class="footer">the tale persists · ← / → to navigate</div>

<script>
// ── chapters ─────────────────────────────────────────
var C = ${JSON.stringify(CHAPTERS)};
var i = 0;
function render() {
  document.getElementById('ch-kicker').textContent = C[i].k;
  document.getElementById('ch-line').textContent = C[i].line;
  document.getElementById('ch-sub').textContent = C[i].sub;
  document.getElementById('idx').textContent = (i+1) + ' / ' + C.length;
}
document.getElementById('prev').onclick = function() { i = (i - 1 + C.length) % C.length; render(); };
document.getElementById('next').onclick = function() { i = (i + 1) % C.length; render(); };
document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowLeft') document.getElementById('prev').click();
  if (e.key === 'ArrowRight') document.getElementById('next').click();
});

// ── brainfuck ────────────────────────────────────────
function bf(src, input) {
  input = input || '';
  var tape = new Uint8Array(30000), p = 0, pc = 0, out = '', ic = 0, steps = 0;
  var pairs = {}, stack = [];
  for (var k = 0; k < src.length; k++) {
    if (src[k] === '[') stack.push(k);
    else if (src[k] === ']') { var j = stack.pop(); pairs[j] = k; pairs[k] = j; }
  }
  while (pc < src.length) {
    if (++steps > 5e6) throw new Error('step limit');
    switch (src[pc]) {
      case '>': p = (p + 1) % tape.length; break;
      case '<': p = (p - 1 + tape.length) % tape.length; break;
      case '+': tape[p] = (tape[p] + 1) & 255; break;
      case '-': tape[p] = (tape[p] - 1 + 256) & 255; break;
      case '.': out += String.fromCharCode(tape[p]); break;
      case ',': tape[p] = ic < input.length ? input.charCodeAt(ic++) & 255 : 0; break;
      case '[': if (tape[p] === 0) pc = pairs[pc]; break;
      case ']': if (tape[p] !== 0) pc = pairs[pc]; break;
    }
    pc++;
  }
  return out;
}
document.getElementById('runbf').onclick = function() {
  try { document.getElementById('bfout').textContent = bf(document.getElementById('bf').value); }
  catch (e) { document.getElementById('bfout').textContent = 'error: ' + e.message; }
};

// ── mini-lisp ────────────────────────────────────────
function tok(s) { return s.replace(/\\(/g,' ( ').replace(/\\)/g,' ) ').trim().split(/\\s+/); }
function rd(t) {
  var x = t.shift();
  if (x === '(') { var l = []; while (t[0] !== ')') l.push(rd(t)); t.shift(); return l; }
  if (/^-?\\d+(\\.\\d+)?$/.test(x)) return parseFloat(x);
  return x;
}
function evalx(e, env) {
  if (typeof e === 'number') return e;
  if (typeof e === 'string') {
    while (env) { if (e in env.v) return env.v[e]; env = env.p; }
    throw new Error('unbound: ' + e);
  }
  var h = e[0];
  if (h === 'if') return evalx(e[1], env) ? evalx(e[2], env) : evalx(e[3], env);
  if (h === 'define') {
    if (typeof e[1] === 'string') { env.v[e[1]] = evalx(e[2], env); return null; }
    var name = e[1][0]; var params = e[1].slice(1); var body = e.slice(2);
    env.v[name] = function() {
      var ce = { v: {}, p: env };
      for (var k = 0; k < params.length; k++) ce.v[params[k]] = arguments[k];
      var r = null;
      for (var b = 0; b < body.length; b++) r = evalx(body[b], ce);
      return r;
    };
    return null;
  }
  if (h === 'lambda') {
    var params = e[1]; var body = e.slice(2); var closure = env;
    return function() {
      var ce = { v: {}, p: closure };
      for (var k = 0; k < params.length; k++) ce.v[params[k]] = arguments[k];
      var r = null;
      for (var b = 0; b < body.length; b++) r = evalx(body[b], ce);
      return r;
    };
  }
  var fn = evalx(e[0], env);
  var args = e.slice(1).map(function(a) { return evalx(a, env); });
  return fn.apply(null, args);
}
function mklisp() {
  var env = { v: {
    '+': function(a,b){return a+b;}, '-': function(a,b){return a-b;},
    '*': function(a,b){return a*b;}, '/': function(a,b){return a/b;},
    '<': function(a,b){return a<b;}, '>': function(a,b){return a>b;},
    '<=': function(a,b){return a<=b;}, '>=': function(a,b){return a>=b;},
    '=': function(a,b){return a===b;}, 'mod': function(a,b){return a%b;}
  }, p: null };
  return env;
}
document.getElementById('runlisp').onclick = function() {
  try {
    var src = '(begin ' + document.getElementById('lisp').value + ')';
    var t = tok(src);
    // hack: fake 'begin' as sequential eval
    t.shift(); // (
    t.shift(); // begin
    var env = mklisp();
    var r = null;
    while (t.length && t[0] !== ')') r = evalx(rd(t), env);
    document.getElementById('lispout').textContent = String(r);
  } catch (e) {
    document.getElementById('lispout').textContent = 'error: ' + e.message;
  }
};
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="codex.html"',
      "Cache-Control": "no-store",
      "X-Variance": "true",
      "X-Airdrop": "true",
    },
  });
}
