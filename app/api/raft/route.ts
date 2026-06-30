import { NextResponse } from "next/server";

/**
 * A toy Raft consensus vote, played each time the endpoint is hit.
 * Five named nodes vote on the question "should the mouse drink the milk?"
 * with a slight bias toward "no" (the lactose intolerant constraint).
 *
 * Returns the leader, the term, the vote tallies and a transcript.
 */

const NODES = ["mouse", "cat", "boot", "moon", "bird"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET() {
  const term = 1 + Math.floor(Math.random() * 9999);
  const leader = pick(NODES);
  const proposal = "should the mouse drink the milk?";
  const transcript: string[] = [];
  const tally: Record<string, number> = { yes: 0, no: 0 };

  transcript.push(`[term ${term}] ${leader} proposes: ${proposal}`);
  for (const n of NODES) {
    // mouse + bird tend to no (lactose, ethical), cat tends no (vegetarian milk irony), boot/moon neutral
    let vote: "yes" | "no";
    if (n === "mouse" || n === "bird") vote = Math.random() < 0.1 ? "yes" : "no";
    else if (n === "cat") vote = Math.random() < 0.35 ? "yes" : "no";
    else vote = Math.random() < 0.5 ? "yes" : "no";
    tally[vote]++;
    transcript.push(`  ${n.padEnd(6)} → ${vote}`);
  }

  const accepted = tally.yes > tally.no;
  const decision = accepted
    ? "ACCEPTED · the mouse may drink the milk"
    : "REJECTED · the milk goes to the cat. for the cause.";

  transcript.push(`[term ${term}] decision: ${decision}`);

  return NextResponse.json(
    {
      protocol: "raft (toy)",
      term,
      leader,
      proposal,
      tally,
      decision,
      accepted,
      transcript,
    },
    {
      headers: {
        "X-Variance": "true",
        "X-Consensus": "achieved",
        "Cache-Control": "no-store",
      },
    },
  );
}
