export const MISSIONS = Object.freeze({
  "stage-01": Object.freeze([
    { title: "GHOST FLEET", objective: "Break the outer patrol screen", beat: "APPROACH" },
    { title: "BOARDING RUN", objective: "Enter the shattered hull", beat: "INFILTRATE" },
    { title: "ARMORED SPINE", objective: "Destroy the command bulkhead", beat: "BREACH" },
    { title: "DEAD ADMIRAL", objective: "Eliminate Wreck Warden", beat: "CORE" }
  ]),
  "stage-02": Object.freeze([
    { title: "CLOUD ASCENT", objective: "Ride the refinery updraft", beat: "APPROACH" },
    { title: "PRESSURE LOCK", objective: "Cross the shutter battery", beat: "INFILTRATE" },
    { title: "FLOW REVERSAL", objective: "Overload the pressure line", beat: "SABOTAGE" },
    { title: "TOWER HEART", objective: "Stop Refinery Guardian", beat: "CORE" }
  ]),
  "stage-03": Object.freeze([
    { title: "LIVING HULL", objective: "Cut through the outer membrane", beat: "APPROACH" },
    { title: "DIGESTIVE VAULT", objective: "Survive the contracting gut", beat: "INFILTRATE" },
    { title: "REGENERATION NEST", objective: "Burn the cyst network", beat: "PURGE" },
    { title: "HEART CHAMBER", objective: "Destroy Ark Core", beat: "CORE" }
  ]),
  "stage-04": Object.freeze([
    { title: "CORONA DROP", objective: "Descend through the heat front", beat: "APPROACH" },
    { title: "COOLANT DUCT", objective: "Use the shielding corridor", beat: "INFILTRATE" },
    { title: "MELTDOWN RUN", objective: "Break the thermal shutters", beat: "SABOTAGE" },
    { title: "FURNACE CONTROL", objective: "Stop the runaway reactor", beat: "CORE" }
  ]),
  "stage-05": Object.freeze([
    { title: "CRYSTAL SURFACE", objective: "Skim the computation sea", beat: "APPROACH" },
    { title: "REFLECTION REEF", objective: "Turn enemy fire on the reef", beat: "INFILTRATE" },
    { title: "LOGIC LABYRINTH", objective: "Find the real signal path", beat: "DECODE" },
    { title: "ORACLE MIRROR", objective: "Expose the true Prism Oracle", beat: "CORE" }
  ]),
  "stage-06": Object.freeze([
    { title: "PHASE PERIMETER", objective: "Enter the zero-point relay", beat: "APPROACH" },
    { title: "GRAVITY VAULT", objective: "Cross the inverted chamber", beat: "INFILTRATE" },
    { title: "DEFENSE REPRISE", objective: "Defeat the archived defenses", beat: "OVERRIDE" },
    { title: "SOVEREIGN LINK", objective: "Sever the relay intelligence", beat: "CORE" }
  ])
});

export function missionFor(stageId, sectionIndex = 0) {
  return MISSIONS[stageId]?.[sectionIndex] ?? MISSIONS["stage-01"][0];
}
