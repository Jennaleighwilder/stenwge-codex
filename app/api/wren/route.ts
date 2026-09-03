import { NextResponse } from "next/server";
import {
  ARTIFACTS,
  AESTHETIC,
  BLIND_SPOTS,
  HER_MESSAGES,
  LEXICON,
  REFUSALS,
  VOCABULARY,
  computeRhythm,
  say,
} from "../../lib/wren-portrait";

export const dynamic = "force-dynamic";

/**
 * A machine-readable portrait of Jennifer Leigh West, drawn only from
 * the traces present in this workspace. Every field carries an evidence
 * badge (OBSERVED / DERIVED / HEURISTIC / UNRESOLVED / MODEL-GENERATED /
 * HUMAN-SUPPLIED), following her master build prompt's evidence contract.
 *
 *   curl -s https://<host>/api/wren | jq
 *   curl -s https://<host>/api/wren?say=1&seed=42
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const seed = Number(url.searchParams.get("seed") ?? Math.floor(Math.random() * 1e6));
  const wantSay = url.searchParams.get("say") === "1";

  if (wantSay) {
    return NextResponse.json({
      badge: "DERIVED",
      source:
        "app/lib/wren-portrait.ts :: say() — pure template generator over her observed vocabulary and rhythm",
      seed,
      sentence: say(seed),
    });
  }

  const rhythm = computeRhythm();

  const body = {
    who: "Jennifer Leigh West",
    organization: {
      value: "The Forgotten Code Research Institute",
      badge: "OBSERVED",
      source: "REFERENCE_WEST_OS_COMPLETE_SYSTEM_V2.md:4",
    },
    disclosure: {
      value:
        "This portrait was drawn only from files present in the stenwge-codex workspace and messages sent during a single conversation. The machine has no access to the author's other repositories, apps, camera, or biometrics.",
      badge: "HUMAN-SUPPLIED",
      source: "author's own claim, this file",
    },
    redaction: {
      value:
        "One third party's name, title, and employer appeared in an earlier version of this portrait, inside an OBSERVED directory listing. They were removed at the author's request. The redaction is marked in place as <redacted> rather than rewritten away, so the evidence contract still holds: what you see is the real listing with one name withheld.",
      badge: "HUMAN-SUPPLIED",
      source: "author's own request",
    },
    evidence_contract: {
      badge: "OBSERVED",
      source: "MASTER_BUILD_PROMPT.md § 'Evidence contract'",
      badges: {
        OBSERVED: "directly returned by executed code or supplied source",
        DERIVED: "deterministic transformation with its rule visible",
        HEURISTIC: "algorithmic estimate with implementation identified",
        "MODEL-GENERATED":
          "produced by a named model with prompt/version boundary recorded",
        "HUMAN-SUPPLIED": "entered or approved by Jennifer/Ben",
        UNRESOLVED: "insufficient evidence",
      },
    },
    artifacts: ARTIFACTS,
    lexicon: LEXICON,
    vocabulary: {
      badge: "OBSERVED",
      source:
        "hand-lifted from HER_MESSAGES + REFERENCE_WREN_FUNKY_CORE_INVENTORY.md",
      tokens: VOCABULARY,
    },
    rhythm: {
      badge: "DERIVED",
      source:
        "app/lib/wren-portrait.ts :: computeRhythm() over HER_MESSAGES (verbatim quotes)",
      messages_analyzed: HER_MESSAGES.length,
      stats: rhythm,
    },
    refusals: REFUSALS,
    aesthetic: AESTHETIC,
    blind_spots: BLIND_SPOTS.map((s) => ({
      value: s,
      badge: "UNRESOLVED",
    })),
    interpretation: [
      {
        claim:
          "An engineer who thinks of code as anatomy. Her systems have organs, scars, a nervous warning map, metabolism.",
        badge: "HEURISTIC",
        source: "REFERENCE_WREN_FUNKY_CORE_INVENTORY.md:5-132",
      },
      {
        claim:
          "A poet who writes production-ready governance software. She does not want to be right; she wants to be falsifiable.",
        badge: "OBSERVED",
        source: "MASTER_BUILD_PROMPT.md:120",
      },
      {
        claim: "She names herself in her own vocabulary before she asks a question.",
        badge: "OBSERVED",
        source: "conversation message 4: 'I'm a stenwge bird ain't I'",
      },
    ],
    sample_from_her: {
      badge: "OBSERVED",
      source: "conversation message " + HER_MESSAGES.length + " of " + HER_MESSAGES.length,
      verbatim: HER_MESSAGES[HER_MESSAGES.length - 1],
    },
    sample_generator: {
      badge: "DERIVED",
      source: "app/lib/wren-portrait.ts :: say()",
      seed,
      sentence: say(seed),
      note: "pure template function — no model, no training. read the whole file.",
    },
    canonical_note:
      "This endpoint is the mirror of /wren. The rules on this page are hers, not the machine's.",
  };

  return NextResponse.json(body, {
    headers: {
      "X-Portrait-Method": "trace-only",
      "X-Model-Generated": "false",
      "X-Read-The-Code": "/app/lib/wren-portrait.ts",
    },
  });
}
