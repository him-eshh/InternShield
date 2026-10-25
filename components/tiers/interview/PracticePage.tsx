"use client";
// /practice entry: feeds Interview from the shared app state and wires the round panels (interview stream owns this after setup).
import { TIER_FLAGS } from "@/lib/tiers/flags";
import { useAppState } from "../../shell/AppStateProvider";
import { useBack } from "../../shell/useBack";
import CodingRound from "./CodingRound";
import DesignRound from "./DesignRound";
import Interview from "./Interview";

export default function PracticePage() {
  const back = useBack();
  const { ready, profile, resume, targets } = useAppState();
  if (!ready) return null;
  return (
    <Interview
      profile={profile}
      resume={resume}
      target={targets.practice}
      onBack={back}
      roundsEnabled={{
        coding: TIER_FLAGS.coding,
        design: TIER_FLAGS.design,
        case: TIER_FLAGS.case,
        finance: TIER_FLAGS.finance,
        portfolio: TIER_FLAGS.portfolio,
        challenge: TIER_FLAGS.challenge,
      }}
      renderRound={(round, panel) =>
        round === "coding" && TIER_FLAGS.coding ? (
          <CodingRound {...panel} />
        ) : (round === "design" && TIER_FLAGS.design) || (round === "challenge" && TIER_FLAGS.challenge) ? (
          <DesignRound {...panel} />
        ) : null
      }
    />
  );
}
