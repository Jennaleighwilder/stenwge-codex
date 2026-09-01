"use client";

import { useEffect, useReducer, useRef, useState } from "react";

/**
 * A tiny Raft cluster. Five nodes: mouse, cat, boot, moon, bird.
 * Each node has:
 *   role        follower | candidate | leader
 *   term        i32
 *   log         entry[]
 *   votedFor    node id | null
 *   alive       boolean
 *
 * Time is discretized into ticks (100ms). Each tick:
 *   - Followers with expired election timer → become candidate, increment
 *     term, requestVote broadcast
 *   - Candidates count votes; majority → leader; timeout → new election
 *   - Leaders every 3 ticks broadcast appendEntries (heartbeat + log)
 *
 * Messages animate along edges. Click a node to kill/revive it.
 */

type NodeId = "mouse" | "cat" | "boot" | "moon" | "bird";
const NODES: NodeId[] = ["mouse", "cat", "boot", "moon", "bird"];

type Role = "follower" | "candidate" | "leader";

type LogEntry = { term: number; value: string };

type Node = {
  id: NodeId;
  role: Role;
  term: number;
  log: LogEntry[];
  votedFor: NodeId | null;
  electionAt: number;             // tick when election times out
  votesReceived: Set<NodeId>;
  alive: boolean;
};

type Msg =
  | { kind: "requestVote"; from: NodeId; to: NodeId; term: number; lastLogIndex: number; lastLogTerm: number }
  | { kind: "voteGranted"; from: NodeId; to: NodeId; term: number; granted: boolean }
  | { kind: "append"; from: NodeId; to: NodeId; term: number; entries: LogEntry[]; commit: number }
  | { kind: "appendAck"; from: NodeId; to: NodeId; term: number; ok: boolean; matchIndex: number };

type FlyingMsg = {
  id: number;
  msg: Msg;
  bornAt: number;
  arrivesAt: number;
};

type State = {
  tick: number;
  nodes: Record<NodeId, Node>;
  flying: FlyingMsg[];
  transcript: string[];
  proposals: string[];  // proposal queue (leader consumes)
};

const ELECTION_MIN = 15;      // ticks (~1.5s)
const ELECTION_MAX = 30;
const HEARTBEAT = 3;
const MSG_TICKS = 4;          // travel time
const MAJORITY = 3;
let msgIdSeq = 1;

function initialState(): State {
  const nodes: Record<NodeId, Node> = {} as any;
  for (const id of NODES) {
    nodes[id] = {
      id,
      role: "follower",
      term: 0,
      log: [],
      votedFor: null,
      electionAt: Math.floor(ELECTION_MIN + Math.random() * (ELECTION_MAX - ELECTION_MIN)),
      votesReceived: new Set(),
      alive: true,
    };
  }
  return {
    tick: 0,
    nodes,
    flying: [],
    transcript: [],
    proposals: [],
  };
}

type Action =
  | { type: "tick" }
  | { type: "kill"; id: NodeId }
  | { type: "propose"; value: string }
  | { type: "reset" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "reset":
      return initialState();
    case "kill": {
      const nodes = { ...s.nodes, [a.id]: { ...s.nodes[a.id], alive: !s.nodes[a.id].alive } };
      const t = [...s.transcript, `⚡ ${s.tick} · ${a.id} → ${nodes[a.id].alive ? "revived" : "killed"}`];
      // if killed, reset role to follower with fresh timer for next revive
      if (!nodes[a.id].alive) {
        nodes[a.id].role = "follower";
        nodes[a.id].votedFor = null;
        nodes[a.id].votesReceived = new Set();
      } else {
        nodes[a.id].electionAt = s.tick + rand(ELECTION_MIN, ELECTION_MAX);
      }
      return { ...s, nodes, transcript: t.slice(-40) };
    }
    case "propose": {
      return { ...s, proposals: [...s.proposals, a.value] };
    }
    case "tick": {
      return step(s);
    }
  }
}

function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

function step(s: State): State {
  const tick = s.tick + 1;
  const nodes: Record<NodeId, Node> = {} as any;
  for (const id of NODES) nodes[id] = { ...s.nodes[id], votesReceived: new Set(s.nodes[id].votesReceived), log: [...s.nodes[id].log] };
  const transcript: string[] = [];
  const flying: FlyingMsg[] = [];
  const proposals = [...s.proposals];

  // deliver messages that have arrived
  for (const fm of s.flying) {
    if (tick >= fm.arrivesAt) {
      const to = nodes[fm.msg.to];
      if (!to.alive) continue;   // dropped
      handleMsg(to, fm.msg, nodes, flying, transcript, tick);
    } else {
      flying.push(fm);
    }
  }

  // tick each node
  for (const id of NODES) {
    const n = nodes[id];
    if (!n.alive) continue;

    if (n.role === "follower" || n.role === "candidate") {
      if (tick >= n.electionAt) {
        // become candidate
        n.role = "candidate";
        n.term += 1;
        n.votedFor = id;
        n.votesReceived = new Set([id]);
        n.electionAt = tick + rand(ELECTION_MIN, ELECTION_MAX);
        transcript.push(`▲ ${tick} · ${id} starts election, term ${n.term}`);
        // broadcast requestVote
        for (const peer of NODES) {
          if (peer === id) continue;
          flying.push({
            id: msgIdSeq++,
            bornAt: tick,
            arrivesAt: tick + MSG_TICKS,
            msg: {
              kind: "requestVote",
              from: id,
              to: peer,
              term: n.term,
              lastLogIndex: n.log.length - 1,
              lastLogTerm: n.log.at(-1)?.term ?? 0,
            },
          });
        }
      }
    }

    if (n.role === "leader") {
      // heartbeat every HEARTBEAT ticks
      if (tick % HEARTBEAT === 0) {
        // append any pending proposal to log first
        let newEntry: LogEntry | null = null;
        if (proposals.length) {
          newEntry = { term: n.term, value: proposals.shift()! };
          n.log.push(newEntry);
          transcript.push(`● ${tick} · leader ${id} appends "${newEntry.value}" @ term ${n.term}`);
        }
        for (const peer of NODES) {
          if (peer === id) continue;
          flying.push({
            id: msgIdSeq++,
            bornAt: tick,
            arrivesAt: tick + MSG_TICKS,
            msg: {
              kind: "append",
              from: id,
              to: peer,
              term: n.term,
              entries: n.log,
              commit: n.log.length,
            },
          });
        }
      }
    }
  }

  return {
    tick,
    nodes,
    flying,
    transcript: [...s.transcript, ...transcript].slice(-40),
    proposals,
  };
}

function handleMsg(
  n: Node,
  m: Msg,
  all: Record<NodeId, Node>,
  outbox: FlyingMsg[],
  transcript: string[],
  tick: number,
) {
  // higher term always demotes to follower
  if ((m as any).term > n.term) {
    n.term = (m as any).term;
    n.role = "follower";
    n.votedFor = null;
    n.votesReceived = new Set();
    n.electionAt = tick + rand(ELECTION_MIN, ELECTION_MAX);
  }

  switch (m.kind) {
    case "requestVote": {
      let grant = false;
      const upToDate =
        m.lastLogTerm > (n.log.at(-1)?.term ?? 0) ||
        (m.lastLogTerm === (n.log.at(-1)?.term ?? 0) &&
          m.lastLogIndex >= n.log.length - 1);
      if (m.term >= n.term && (n.votedFor === null || n.votedFor === m.from) && upToDate) {
        grant = true;
        n.votedFor = m.from;
        n.electionAt = tick + rand(ELECTION_MIN, ELECTION_MAX);
      }
      outbox.push({
        id: msgIdSeq++,
        bornAt: tick,
        arrivesAt: tick + MSG_TICKS,
        msg: {
          kind: "voteGranted",
          from: n.id,
          to: m.from,
          term: n.term,
          granted: grant,
        },
      });
      break;
    }
    case "voteGranted": {
      if (n.role !== "candidate" || m.term !== n.term) return;
      if (m.granted) {
        n.votesReceived.add(m.from);
        if (n.votesReceived.size >= MAJORITY) {
          n.role = "leader";
          transcript.push(`★ ${tick} · ${n.id} elected leader (term ${n.term})`);
          // immediate heartbeat
          for (const peer of NODES) {
            if (peer === n.id) continue;
            outbox.push({
              id: msgIdSeq++,
              bornAt: tick,
              arrivesAt: tick + MSG_TICKS,
              msg: {
                kind: "append",
                from: n.id,
                to: peer,
                term: n.term,
                entries: n.log,
                commit: n.log.length,
              },
            });
          }
        }
      }
      break;
    }
    case "append": {
      if (m.term < n.term) return;
      n.role = "follower";
      n.electionAt = tick + rand(ELECTION_MIN, ELECTION_MAX);
      // adopt log (simple: replace)
      n.log = [...m.entries];
      outbox.push({
        id: msgIdSeq++,
        bornAt: tick,
        arrivesAt: tick + MSG_TICKS,
        msg: {
          kind: "appendAck",
          from: n.id,
          to: m.from,
          term: n.term,
          ok: true,
          matchIndex: n.log.length,
        },
      });
      break;
    }
    case "appendAck":
      break;
  }
}

// ── positions ─────────────────────────────────────────────────────────────
const CX = 300, CY = 240, R = 170;
function pos(i: number, of: number): { x: number; y: number } {
  const a = (i / of) * Math.PI * 2 - Math.PI / 2;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}
const POS: Record<NodeId, { x: number; y: number }> = {} as any;
NODES.forEach((id, i) => (POS[id] = pos(i, NODES.length)));

// ── component ─────────────────────────────────────────────────────────────
export default function RaftLab() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [running, setRunning] = useState(true);
  const [proposal, setProposal] = useState("commit");
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  useEffect(() => {
    const loop = (now: number) => {
      if (now - lastRef.current >= 100) {
        lastRef.current = now;
        if (running) dispatch({ type: "tick" });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  // unlock achievement
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fcri:achievements");
      const arr = raw ? JSON.parse(raw) : [];
      if (arr.indexOf("lab-raft") === -1) {
        arr.push("lab-raft");
        localStorage.setItem("fcri:achievements", JSON.stringify(arr));
      }
    } catch {}
  }, []);

  const leader = NODES.find((id) => state.nodes[id].role === "leader" && state.nodes[id].alive);

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">paper 03</div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          a toy raft cluster, animated
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          Five nodes exchange requestVote and appendEntries in real time.
          Click a node to kill or revive it — watch the cluster re-elect,
          resume, and reconcile.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
        <div className="rounded-md border border-stone-800 bg-stone-950/60 p-2">
          <svg width={600} height={480} className="block">
            {/* edges */}
            {NODES.map((a) =>
              NODES.map((b) =>
                a < b ? (
                  <line
                    key={`${a}-${b}`}
                    x1={POS[a].x}
                    y1={POS[a].y}
                    x2={POS[b].x}
                    y2={POS[b].y}
                    stroke="#292524"
                    strokeWidth={1}
                  />
                ) : null,
              ),
            )}

            {/* flying messages */}
            {state.flying.map((fm) => {
              const t = (state.tick - fm.bornAt) / Math.max(1, fm.arrivesAt - fm.bornAt);
              const from = POS[fm.msg.from];
              const to = POS[fm.msg.to];
              const x = from.x + (to.x - from.x) * t;
              const y = from.y + (to.y - from.y) * t;
              const kind = fm.msg.kind;
              const color =
                kind === "requestVote"
                  ? "#f4dca3"
                  : kind === "voteGranted"
                    ? "#9bd0a5"
                    : kind === "append"
                      ? "#9ec9ff"
                      : "#c9c9c9";
              return (
                <circle
                  key={fm.id}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={color}
                  opacity={0.9}
                />
              );
            })}

            {/* nodes */}
            {NODES.map((id) => {
              const n = state.nodes[id];
              const p = POS[id];
              const color = !n.alive
                ? "#3f3f46"
                : n.role === "leader"
                  ? "#f4dca3"
                  : n.role === "candidate"
                    ? "#c084fc"
                    : "#d6d3d1";
              return (
                <g
                  key={id}
                  transform={`translate(${p.x},${p.y})`}
                  className="cursor-pointer"
                  onClick={() => dispatch({ type: "kill", id })}
                >
                  <circle
                    r={26}
                    fill={n.role === "leader" && n.alive ? color : "#0a0a0a"}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={n.alive ? undefined : "3 3"}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fontFamily="ui-monospace, monospace"
                    fontSize={10}
                    fill={n.role === "leader" && n.alive ? "#111" : color}
                  >
                    {id}
                  </text>
                  <text
                    x={0}
                    y={44}
                    textAnchor="middle"
                    fontFamily="ui-monospace, monospace"
                    fontSize={8}
                    fill="#78716c"
                  >
                    t{n.term} · {n.log.length}e
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-5">
          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              status
            </div>
            <div className="font-mono text-[12px] space-y-1">
              <div>tick: <span className="text-stone-100 tabular-nums">{state.tick}</span></div>
              <div>
                leader:{" "}
                <span className="text-amber-200">
                  {leader ?? "— election in progress —"}
                </span>
              </div>
              <div className="text-stone-500">
                flying msgs: {state.flying.length}
              </div>
            </div>
          </div>

          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              controls
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRunning((v) => !v)}
                className="px-3 py-1.5 rounded bg-amber-200 text-stone-950 text-[11px] font-mono hover:bg-amber-100"
              >
                {running ? "pause" : "resume"}
              </button>
              <button
                onClick={() => dispatch({ type: "reset" })}
                className="px-3 py-1.5 rounded border border-stone-700 text-stone-300 text-[11px] font-mono hover:border-stone-500"
              >
                reset
              </button>
              <input
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                className="flex-1 min-w-32 bg-stone-950 border border-stone-800 rounded px-2 py-1.5 font-mono text-[11px] text-stone-100 outline-none focus:border-amber-200/50"
              />
              <button
                onClick={() => dispatch({ type: "propose", value: proposal })}
                className="px-3 py-1.5 rounded border border-stone-700 text-stone-300 text-[11px] font-mono hover:border-stone-500"
                title="the leader will append this to its log"
              >
                propose
              </button>
            </div>
            <p className="mt-3 text-[10px] text-stone-500">
              click a node in the diagram to kill or revive it.
            </p>
          </div>

          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              transcript
            </div>
            <pre className="font-mono text-[11px] text-stone-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-[1.5]">
              {state.transcript.length ? state.transcript.join("\n") : "(waiting for the first election)"}
            </pre>
          </div>

          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              legend
            </div>
            <ul className="font-mono text-[11px] text-stone-400 space-y-1">
              <li><span className="inline-block w-2 h-2 rounded-full bg-amber-200 mr-2 align-middle" />leader</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-purple-300 mr-2 align-middle" />candidate</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-stone-300 mr-2 align-middle" />follower</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-stone-600 mr-2 align-middle" />dead</li>
              <li className="pt-2"><span className="inline-block w-2 h-2 rounded-full bg-amber-200 mr-2 align-middle" />requestVote</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-emerald-300 mr-2 align-middle" />voteGranted</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-sky-300 mr-2 align-middle" />appendEntries</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
