/**
 * claims — the single registry of every sourced assertion the portrait makes.
 *
 * Both /wren (human) and /api/evidence (machine) read this list, so the audit
 * cannot drift from the page. If a claim is rendered anywhere, it is here,
 * and the contract has already ruled on it.
 */

import { ARTIFACTS, AESTHETIC, LEXICON, REFUSALS } from "./wren-portrait";
import type { Badge } from "./evidence";

export type RegisteredClaim = {
  subject: string;
  badge: Badge;
  source: string;
  section: string;
};

export function allClaims(): RegisteredClaim[] {
  const rows: RegisteredClaim[] = [];

  for (const a of ARTIFACTS) {
    rows.push({
      subject: a.value,
      badge: a.badge as Badge,
      source: a.source,
      section: "i. what sits in the workspace",
    });
  }

  for (const l of LEXICON) {
    rows.push({
      subject: l.value.name,
      badge: l.badge as Badge,
      source: l.source,
      section: "ii. what she names things",
    });
  }

  for (const r of REFUSALS) {
    rows.push({
      subject: r.value,
      badge: r.badge as Badge,
      source: r.source,
      section: "iv. what she refuses",
    });
  }

  for (const a of AESTHETIC) {
    rows.push({
      subject: a.value,
      badge: a.badge as Badge,
      source: a.source,
      section: "v. what she finds beautiful",
    });
  }

  // Claims asserted directly by the API/page rather than by a data module.
  rows.push(
    {
      subject: "The Forgotten Code Research Institute (organization)",
      badge: "OBSERVED",
      source: "REFERENCE_WEST_OS_COMPLETE_SYSTEM_V2.md:4",
      section: "header",
    },
    {
      subject:
        "An engineer who thinks of code as anatomy — organs, scars, a nervous warning map.",
      badge: "HEURISTIC",
      source: "REFERENCE_WREN_FUNKY_CORE_INVENTORY.md:5-132",
      section: "vii. interpretation",
    },
    {
      subject:
        "She does not want to be right; she wants to be falsifiable.",
      badge: "OBSERVED",
      source: "MASTER_BUILD_PROMPT.md:120",
      section: "vii. interpretation",
    },
    {
      subject:
        "She names herself in her own vocabulary before she asks a question.",
      badge: "OBSERVED",
      source: "conversation message 4: 'I'm a stenwge bird ain't I'",
      section: "vii. interpretation",
    },
    {
      subject: "Rhythm statistics over her messages",
      badge: "DERIVED",
      source:
        "app/lib/wren-portrait.ts :: computeRhythm() over HER_MESSAGES (verbatim quotes)",
      section: "iii. how she moves",
    },
    {
      subject: "Generated sample sentence",
      badge: "DERIVED",
      source: "app/lib/wren-portrait.ts :: say()",
      section: "viii. the generator",
    },
    {
      subject: "Evidence contract definition",
      badge: "OBSERVED",
      source: "MASTER_BUILD_PROMPT.md § 'Evidence contract'",
      section: "iv. what she refuses",
    },
    {
      subject: "Disclosure of the machine's access",
      badge: "HUMAN-SUPPLIED",
      source: "author's own claim, this file",
      section: "header",
    },
    {
      subject: "Redaction of a third party's identity",
      badge: "HUMAN-SUPPLIED",
      source: "author's own request",
      section: "header",
    }
  );

  return rows;
}
