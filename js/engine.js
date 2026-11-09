// Stable public domain API. Implementation is organized by responsibility.
export { nightAt, executionThreshold, dayAt, currentAt, cycleOf, addLog, playerName, actorForRole, playersWithEffectiveRole, aliveNeighbors, allNeighbors } from "./engine/context.js";
export { effectActive, activeEffects, isImpaired, protectionFor, soldierSafe, mayorRedirects, butlerMaster } from "./engine/effects.js";
export { alignmentOf, registersAsDemon, registersAsTownsfolk, registersAsMinion, registersAsOutsider, chefCount, empathCount, fortuneTellerYes, characterChoices, infoForStep } from "./engine/information.js";
export { executionDeathForDay, demonChangePending, buildNightQueue, insertStepByOrder, pruneDeadSteps, appendConditionalSteps, startNight, completeStep, endNight, skipStep, currentStep, stepProgress } from "./engine/night.js";
export { kill, becomeDemon, resolveDemonDeath, chooseDemonHeir, attackBlockReason, attackNeedsRedirect, resolveAttack, checkWin, setWinner } from "./engine/death.js";
export { openNominations, nominate, recordVirginNomination, recoverClaim, recordVotes, cancelNomination, resetVotes, leader, execute, executeByDecision, endDay, useSlayer, gossipStatement, moonchildChoice } from "./engine/day.js";
export { setupErrors, secretsErrors, autoSecrets, dealGame, claimSeat } from "./engine/setup.js";
export { manualCorrection, bagSummary } from "./engine/corrections.js";
export { bmrInfoForStep, recordBmrOutcome, resurrectPlayer } from "./engine/bmr.js";
export { recordSvOutcome } from "./engine/sv.js";
