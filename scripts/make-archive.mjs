#!/usr/bin/env node
/**
 * make-archive — emit the evidence contract as one file that needs nothing.
 *
 * Everything built so far dies with the host. The digests live at a URL; the
 * verification recipes live on a page; if Vercel goes away, or the domain
 * lapses, or the account closes, the proof goes with them and all that is
 * left is a claim again.
 *
 * This writes public/wren-evidence.html: a single self-contained document
 * carrying every sealed digest, the Ed25519 attestation, the public key, and
 * a verifier that runs entirely in the browser. No network. No server. No
 * build. Drop a source file onto it and it recomputes the commitments
 * locally and tells you which claims hold.
 *
 * Save it to a disk, a drive, an attachment, an archive. It keeps working
 * with this project deleted.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seal = JSON.parse(readFileSync(join(ROOT, "app/lib/evidence-seal.json"), "utf8"));
const attestPath = join(ROOT, "app/lib/evidence-attestation.json");
const attestation = existsSync(attestPath)
  ? JSON.parse(readFileSync(attestPath, "utf8"))
  : null;

const payload = JSON.stringify({ seal, attestation });

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>the evidence contract · portable verifier</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#000;color:#e7e5e4;font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;padding:0 0 6rem}
  .bar{position:fixed;inset:0 0 auto;height:3px;display:flex;z-index:9}
  .bar i{flex:1}.b1{background:#000}.b2{background:#f5f1e6}.b3{background:#ffd68a}.b4{background:#22d3ee}.b5{background:#7e22ce}
  main{max-width:60rem;margin:0 auto;padding:5rem 1.25rem 0}
  h1{font:400 2.6rem/1.05 Georgia,serif;color:#f5f1e6;margin:0 0 .4rem}
  h1 em{color:#ffd68a;font-style:italic}
  h2{font-size:.65rem;letter-spacing:.4em;text-transform:uppercase;color:#78716c;margin:3rem 0 1rem;font-weight:400}
  p{color:#a8a29e;max-width:46rem}
  .lede{font:400 1.05rem/1.65 Georgia,serif;color:#a8a29e}
  code,pre{font-family:inherit}
  pre{background:#0c0a09;border:1px solid #292524;padding:.9rem;overflow-x:auto;font-size:.72rem;color:#a5f3fc}
  .drop{border:1px dashed #44403c;padding:2.5rem 1.5rem;text-align:center;color:#78716c;cursor:pointer;transition:.15s}
  .drop:hover,.drop.over{border-color:#22d3ee;color:#a5f3fc;background:#0c0a09}
  table{border-collapse:collapse;width:100%;font-size:.72rem;margin-top:1rem}
  td,th{border-bottom:1px solid #1c1917;padding:.5rem .4rem;text-align:left;vertical-align:top}
  th{color:#78716c;font-weight:400;text-transform:uppercase;letter-spacing:.15em;font-size:.6rem}
  .ok{color:#4ade80}.bad{color:#f87171}.skip{color:#78716c}
  .g{font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;border:1px solid;padding:.1rem .35rem}
  .stone{color:#d6d3d1;border-color:#57534e}.salt{color:#fcd34d;border-color:#b45309}.brine{color:#67e8f9;border-color:#0e7490}
  .muted{color:#57534e;font-size:.7rem}
  .big{font:400 2rem/1 Georgia,serif;color:#f5f1e6}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:1.5rem;border-block:1px solid #292524;padding:1.5rem 0}
</style></head><body>
<div class="bar"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i><i class="b5"></i></div>
<main>
  <div class="muted" style="letter-spacing:.4em;text-transform:uppercase;margin-bottom:1.5rem">fcri · portable · evidence.contract</div>
  <h1>The contract,<br><em>off the network.</em></h1>
  <p class="lede" style="margin-top:1.5rem">
    Every sealed digest, the signature over them, and a verifier that runs here in
    this page. No server answers for any of it. If the site that produced this file
    is gone, the proof is not — you are holding it.
  </p>

  <h2>what it holds</h2>
  <div class="grid">
    <div><div class="muted">citations</div><div class="big" id="n-cites">–</div></div>
    <div><div class="muted">sealed</div><div class="big" id="n-sealed">–</div></div>
    <div><div class="muted">hiding</div><div class="big" id="n-hiding">–</div></div>
    <div><div class="muted">testimony</div><div class="big" id="n-test">–</div></div>
  </div>
  <p class="muted" style="margin-top:1rem;word-break:break-all">
    seal sha-256 · <span id="seal-hash"></span><br>
    sealed at · <span id="seal-at"></span>
  </p>

  <h2>attestation</h2>
  <div id="attest"></div>

  <h2>verify a source file</h2>
  <p>
    Drop a cited source document below. Nothing is uploaded — the file is read in
    your browser, the commitments are recomputed with WebCrypto, and every claim
    drawn from that file is checked against the digests baked into this page.
  </p>
  <div class="drop" id="drop">
    drop a source file here, or click to choose
    <input type="file" id="file" hidden>
  </div>
  <div id="out"></div>

  <h2>what a match proves</h2>
  <p>
    That the quotation is faithful to the document you supplied. It does not prove
    the document is true, and it never promoted an interpretation into a finding.
    Claims resting on a person's word are marked testimony here and are not
    checkable by any amount of arithmetic.
  </p>
</main>
<script id="payload" type="application/json">${payload.replace(/</g, "\\u003c")}</script>
<script>
const DATA = JSON.parse(document.getElementById('payload').textContent);
const SEAL = DATA.seal, ATT = DATA.attestation;
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');

async function sha256(bytes){ return hex(await crypto.subtle.digest('SHA-256', bytes)); }
async function hmac(keyBytes, msgBytes){
  const k = await crypto.subtle.importKey('raw', keyBytes, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, msgBytes));
}
const hexToBytes = h => new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));

const entries = Object.values(SEAL.entries);
document.getElementById('n-cites').textContent = entries.length;
document.getElementById('n-sealed').textContent = entries.filter(e=>e.status==='SEALED').length;
document.getElementById('n-hiding').textContent = entries.filter(e=>e.hides).length;
document.getElementById('n-test').textContent = entries.filter(e=>e.status==='TESTIMONY').length;
document.getElementById('seal-hash').textContent = SEAL.sealSha256;
document.getElementById('seal-at').textContent = SEAL.sealedAt;

(async () => {
  const el = document.getElementById('attest');
  if(!ATT){ el.innerHTML = '<p class="skip">No attestation travelled with this file.</p>'; return; }
  let verdict = '<span class="skip">could not check in this browser</span>';
  try {
    const pk = await crypto.subtle.importKey('raw', hexToBytes([...atob(ATT.publicKey)].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('')), {name:'Ed25519'}, false, ['verify']);
    const sig = Uint8Array.from(atob(ATT.signature), c=>c.charCodeAt(0));
    const ok = await crypto.subtle.verify('Ed25519', pk, sig, enc.encode(ATT.sealSha256));
    verdict = ok
      ? '<span class="ok">signature verifies — this seal is byte-for-byte the seal that was signed</span>'
      : '<span class="bad">signature does NOT verify — this file has been altered since signing</span>';
  } catch(e){ verdict = '<span class="skip">Ed25519 unavailable in this browser (' + e.name + ') — the signature is still in this file and checkable elsewhere</span>'; }
  el.innerHTML = '<p>' + verdict + '</p><pre>algorithm  ' + ATT.algorithm +
    '\\npublic key ' + ATT.publicKey + '\\nsignature  ' + ATT.signature +
    '\\nsigned at  ' + ATT.signedAt + '</pre>' +
    '<p class="muted">' + ATT.does_not_establish.map(s=>'· '+s).join('<br>') + '</p>';
})();

async function check(name, buf){
  const bytes = new Uint8Array(buf);
  const text = new TextDecoder('utf-8').decode(bytes);
  const lines = text.split('\\n');
  const rows = [];

  const tag = await hmac(bytes, enc.encode('fcri:file:v1|' + name));

  for(const e of entries){
    if(e.file !== name || e.status !== 'SEALED') continue;
    if(!e.lines || !e.spanDigest){
      rows.push({cite:e.cite, grade:e.grade||'—', state:'skip', note:'no line span to recompute'});
      continue;
    }
    const [a,b] = e.lines;
    if(a<1 || b>lines.length){ rows.push({cite:e.cite,grade:e.grade,state:'bad',note:'lines outside this file'}); continue; }
    const span = lines.slice(a-1,b).join('\\n') + '\\n';
    let got;
    if(e.grade === 'stone'){
      got = await sha256(enc.encode(span));
    } else {
      const key = await hmac(bytes, enc.encode('fcri:brine:v1|' + e.cite));
      const msg = e.grade === 'salt' ? (e.spanSalt + '\\n' + span) : span;
      got = await hmac(hexToBytes(key), enc.encode(msg));
    }
    rows.push({cite:e.cite, grade:e.grade, state: got===e.spanDigest ? 'ok':'bad',
               note: got===e.spanDigest ? got.slice(0,24)+'…' : 'computed '+got.slice(0,16)+'… expected '+e.spanDigest.slice(0,16)+'…'});
  }

  const tagged = entries.filter(e=>e.file===name && e.fileTag);
  const tagOk = tagged.length ? tagged.every(e=>e.fileTag===tag) : null;

  const out = document.getElementById('out');
  if(!rows.length && tagOk===null){
    out.innerHTML = '<p class="skip">No sealed claim cites a file named <code>'+name+'</code>. Nothing to check — which is itself an answer.</p>';
    return;
  }
  const good = rows.filter(r=>r.state==='ok').length, bad = rows.filter(r=>r.state==='bad').length;
  out.innerHTML =
    '<p>' + (bad ? '<span class="bad">'+bad+' MISMATCH</span> · ' : '') +
    '<span class="ok">'+good+' verified</span> against <code>'+name+'</code>' +
    (tagOk===null ? '' : tagOk ? ' · <span class="ok">file tag matches</span>' : ' · <span class="bad">file tag differs — this is not the document that was sealed</span>') +
    '</p><table><tr><th>grade</th><th>citation</th><th>result</th></tr>' +
    rows.map(r=>'<tr><td><span class="g '+(r.grade||'')+'">'+(r.grade||'—')+'</span></td><td>'+r.cite+
      '</td><td class="'+(r.state==='ok'?'ok':r.state==='bad'?'bad':'skip')+'">'+
      (r.state==='ok'?'verified':r.state==='bad'?'MISMATCH':'skipped')+
      ' <span class="muted">'+r.note+'</span></td></tr>').join('') + '</table>';
}

const drop = document.getElementById('drop'), input = document.getElementById('file');
drop.onclick = () => input.click();
input.onchange = async e => { const f = e.target.files[0]; if(f) check(f.name, await f.arrayBuffer()); };
drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = async e => {
  e.preventDefault(); drop.classList.remove('over');
  const f = e.dataTransfer.files[0]; if(f) check(f.name, await f.arrayBuffer());
};
</script>
</body></html>
`;

mkdirSync(join(ROOT, "public"), { recursive: true });
const out = join(ROOT, "public/wren-evidence.html");
writeFileSync(out, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`wrote public/wren-evidence.html (${kb} KB, self-contained)`);
console.log(
  `  ${Object.keys(seal.entries).length} citations · attestation ${attestation ? "included" : "ABSENT"}`
);
