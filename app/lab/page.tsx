import Link from "next/link";

/**
 * /lab — index page. A "papers" list of the experiments in the research wing.
 */
export const metadata = {
  title: "the research wing · fcri",
  description:
    "Interactive research artifacts from the Forgotten Code Research Institute.",
};

const PAPERS = [
  {
    href: "/lab/lisp",
    id: "01",
    title: "on the smallest useful lisp",
    abstract:
      "A ~600-line Lisp interpreter — lambdas, closures, let/let*/letrec, recursion, first-class functions, cons/car/cdr, higher-order map/filter/fold. Runs on the same page as the codex.",
    tags: ["languages", "interpreters"],
  },
  {
    href: "/lab/bf",
    id: "02",
    title: "brainfuck → webassembly, jit-compiled in the browser",
    abstract:
      "A real single-pass compiler that emits valid WASM bytecode from a BF program, instantiates it against a shared linear memory, and executes. Hexdumps the module. No wrappers.",
    tags: ["compilers", "wasm"],
  },
  {
    href: "/lab/raft",
    id: "03",
    title: "a toy raft cluster, animated",
    abstract:
      "Five nodes exchange requestVote and appendEntries in real time. Elect leaders, replicate the log, kill nodes, watch the cluster reconcile. Runs entirely client-side.",
    tags: ["distributed", "consensus"],
  },
  {
    href: "/lab/gray-scott",
    id: "04",
    title: "gray-scott reaction-diffusion on the GPU",
    abstract:
      "Two coupled reactants sampled through a ping-pong pair of framebuffers, iterated on a fragment shader at 60 fps. Adjust feed and kill in real time and watch coral emerge.",
    tags: ["gpu", "shaders", "simulation"],
  },
  {
    href: "/lab/merkle",
    id: "05",
    title: "content-addressed story with a signed tip",
    abstract:
      "The codex is served as a git-style hash chain — each chapter is sha-256(parent || canonical). Fetches the manifest, recomputes the whole chain in-browser, verifies the HMAC tip.",
    tags: ["crypto", "hashing"],
  },
  {
    href: "/lab/dream",
    id: "06",
    title: "streaming dreams over server-sent events",
    abstract:
      "The /api/dream endpoint speaks SSE. Watch a poem arrive one word at a time — a tiny, honest imitation of token streaming from an LLM.",
    tags: ["streaming", "network"],
  },
  {
    href: "/lab/nca",
    id: "07",
    title: "neural cellular automata, growing on the GPU",
    abstract:
      "16 channels per cell packed into 4 float textures via WebGL2 MRT. Each frame every cell perceives its neighborhood with 3 kernels, runs a 48→32→16 ReLU MLP, applies the residual, and fires with 50% probability. Click to plant new seeds.",
    tags: ["ml", "gpu", "shaders"],
  },
  {
    href: "/lab/moon",
    id: "08",
    title: "the moon, ray-marched",
    abstract:
      "One fragment shader. Mouse, cat, boot, sea, and moon are all signed distance functions traced with 96 sphere-marching steps per pixel. Normals from finite differences, shadows from a soft-shadow ray, AO from 5 short samples. No polygons.",
    tags: ["graphics", "sdf", "shaders"],
  },
  {
    href: "/lab/shader",
    id: "09",
    title: "a live GLSL playground",
    abstract:
      "Write GLSL 300 es and watch it recompile as you type. Errors are surfaced straight from the driver. Four presets to warm up the shader instinct.",
    tags: ["graphics", "editor"],
  },
];

export default function LabIndex() {
  return (
    <>
      <div className="mb-10">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500 mb-3">
          the forgotten code research institute
        </div>
        <h1 className="font-serif italic text-4xl md:text-5xl text-stone-50 mb-4">
          the research wing
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          six experiments in what a page can actually be. everything below runs
          in your browser — no servers doing heavy lifting, no libraries doing
          the interesting parts. click a paper.
        </p>
        <UnlockLabVisit />
      </div>

      <ol className="space-y-6">
        {PAPERS.map((p) => (
          <li
            key={p.id}
            className="group border border-stone-900 hover:border-amber-200/40 rounded-md transition"
          >
            <Link href={p.href} className="block p-5">
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-[10px] text-stone-600 tabular-nums">
                  {p.id}
                </span>
                <h2 className="font-serif text-xl text-stone-100 group-hover:text-amber-100">
                  {p.title}
                </h2>
              </div>
              <p className="text-[12px] text-stone-400 leading-relaxed mb-3">
                {p.abstract}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-stone-600">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 border border-stone-800 rounded"
                  >
                    {t}
                  </span>
                ))}
                <span className="ml-auto text-stone-500 group-hover:text-amber-200">
                  → read
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

function UnlockLabVisit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var raw = localStorage.getItem('fcri:achievements');
            var arr = raw ? JSON.parse(raw) : [];
            if (arr.indexOf('lab-visit') === -1) {
              arr.push('lab-visit');
              localStorage.setItem('fcri:achievements', JSON.stringify(arr));
            }
          } catch (e) {}
        `,
      }}
    />
  );
}
