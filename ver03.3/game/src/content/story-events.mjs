const operation = (newEnemies, events, outcome) => Object.freeze({
  newEnemies: Object.freeze(newEnemies),
  events: Object.freeze(events.map(([progress, speaker, title, message, objective, enemyType, pattern, landmark]) => Object.freeze({
    progress, speaker, title, message, objective, enemyType, pattern, landmark, count: progress > 0.8 ? 7 : 5
  }))),
  outcome
});

export const STORY_OPERATIONS = Object.freeze({
  "stage-01": operation(["mimetic-wreck", "boarding-cutter"], [
    [0.04, "MATA", "FALSE DEBRIS", "The wreckage is waking up.", "Identify the disguised sentries", "mimetic-wreck", "ambush", "DORMANT ESCORT"],
    [0.24, "CONTROL", "HANGAR OPEN", "Launch doors are cycling ahead.", "Break the boarding wave", "boarding-cutter", "pincer", "RUPTURED HANGAR"],
    [0.45, "MATA", "FLAGSHIP FOUND", "That hull is still transmitting orders.", "Enter the command carrier", "mimetic-wreck", "fortress", "GHOST FLAGSHIP"],
    [0.67, "CONTROL", "LOCKDOWN", "Bulkheads sealed around the reactor route.", "Destroy the locking cutters", "boarding-cutter", "crossfire", "ARMORED SPINE"],
    [0.88, "MATA", "ADMIRAL SIGNAL", "The commander is moving to intercept.", "Open the bridge approach", "mimetic-wreck", "last-guard", "DEAD BRIDGE"]
  ], "Flagship command link severed"),
  "stage-02": operation(["strike-arrester", "pressure-thief"], [
    [0.04, "CONTROL", "STORM FRONT", "Lightning cages the refinery approach.", "Ground the arrestor formation", "strike-arrester", "vertical", "THUNDER CROWN"],
    [0.24, "WORKER 7", "DISTRESS PING", "Our maintenance wing is trapped below.", "Clear a route to the workers", "pressure-thief", "rescue", "WORKER DOCK"],
    [0.45, "MATA", "VALVES REVERSED", "Pressure is flowing back into the tower.", "Protect the reverse-flow line", "strike-arrester", "escort", "PRESSURE HEART"],
    [0.67, "CONTROL", "EMERGENCY SEAL", "The tower is closing every shutter.", "Pierce the emergency locks", "pressure-thief", "crossfire", "SHUTTER CATHEDRAL"],
    [0.88, "WORKER 7", "TOWER EXPOSED", "Guardian has left the control crown.", "Reach the refinery crown", "strike-arrester", "last-guard", "CONTROL CROWN"]
  ], "Workers freed; pressure tower dormant"),
  "stage-03": operation(["maw-larva", "nerve-knot"], [
    [0.04, "MATA", "HULL INCISION", "The skin is healing behind us.", "Keep the incision open", "maw-larva", "swarm", "SCAR GATE"],
    [0.24, "CONTROL", "DIGESTIVE SURGE", "Acid chambers are flooding forward.", "Burn through the feeding swarm", "maw-larva", "vertical", "ACID CISTERN"],
    [0.45, "SURVIVOR", "LIFE SIGNAL", "Evacuation cells are still alive.", "Cut the nerve locks", "nerve-knot", "rescue", "CAPTIVE ARK"],
    [0.67, "MATA", "REGENERATION", "The organ network is rebuilding itself.", "Sever the healing nerves", "nerve-knot", "fortress", "REGENERATION NEST"],
    [0.88, "SURVIVOR", "SEPARATION READY", "Stop the heart and we can break free.", "Enter the heart chamber", "maw-larva", "last-guard", "HEART THROAT"]
  ], "Survivor section separated from the Ark"),
  "stage-04": operation(["coolant-raider", "corona-lance"], [
    [0.04, "CONTROL", "CORONA DROP", "Thermal cover will last ninety seconds.", "Descend below the flare screen", "corona-lance", "vertical", "CORONA WELL"],
    [0.24, "ENGINEER", "COOLANT TRAIN", "The control key is aboard that convoy.", "Overtake the coolant convoy", "coolant-raider", "chase", "COOLANT EXPRESS"],
    [0.45, "MATA", "KEY CAPTURED", "Cooling authority is ours.", "Hold the manual cooling route", "coolant-raider", "escort", "CONTROL GANTRY"],
    [0.67, "ENGINEER", "SHIELD LOSS", "The furnace stripped our heat cover.", "Cross between exhaust pulses", "corona-lance", "crossfire", "EXHAUST CATHEDRAL"],
    [0.88, "CONTROL", "CHAIN REACTION", "The controller is sealing the final vent.", "Force the reactor vent open", "corona-lance", "last-guard", "FURNACE MOUTH"]
  ], "Cooling restored before stellar ignition"),
  "stage-05": operation(["decoy-shard", "logic-binder"], [
    [0.04, "CONTROL", "SIX TARGETS", "Every signal claims to be the Oracle.", "Destroy the false signatures", "decoy-shard", "mirrors", "FALSE HORIZON"],
    [0.24, "MATA", "REFLECTION PATH", "Their fire reveals the solid reef.", "Turn the barrage on the reef", "logic-binder", "crossfire", "MIRROR REEF"],
    [0.45, "CONTROL", "SIGNAL FORK", "The prediction tree split into three futures.", "Follow the unstable branch", "decoy-shard", "pincer", "FUTURE DELTA"],
    [0.67, "MATA", "PARADOX LOCK", "The real path is the one it refuses to show.", "Break the logic binders", "logic-binder", "fortress", "PARADOX ARCH"],
    [0.88, "CONTROL", "TRUE COORDINATE", "One Oracle is casting every shadow.", "Expose the original signal", "decoy-shard", "last-guard", "ORACLE PRISM"]
  ], "Prediction lattice collapsed to one truth"),
  "stage-06": operation(["archive-ghost", "command-leech"], [
    [0.04, "SOVEREIGN", "RECORDED DEFEAT", "I retained every weapon you survived.", "Break the archived vanguard", "archive-ghost", "reprise", "MEMORY GATE"],
    [0.24, "CONTROL", "GRAVITY LOST", "The relay has inverted the approach vector.", "Anchor the local field", "command-leech", "vertical", "NULL VAULT"],
    [0.45, "SOVEREIGN", "RETREAT ORDER", "Mission revoked. Return to base.", "Reject the forged command", "command-leech", "pincer", "FALSE COMMAND"],
    [0.67, "MATA", "BEACON RESTORED", "The real control signal is back online.", "Protect the allied beacon", "archive-ghost", "escort", "MATA BEACON"],
    [0.88, "SOVEREIGN", "LAST CONSENSUS", "Then I will close the route forever.", "Sever the learning core", "archive-ghost", "last-guard", "LEARNING THRONE"]
  ], "Learning core isolated; relay sovereignty ended")
});
