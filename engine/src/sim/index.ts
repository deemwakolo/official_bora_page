/**
 * BORA Engine — deterministic simulation: public surface
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 16. One entry point for the laboratory.
 *
 * Everything the simulation exposes is re-exported here so a caller never has to
 * know which internal file a type came from.
 *
 * The engine remains the source of truth. This package only drives it.
 */

export type {
  SimulationScenario,
  SimulationEvent,
  ScheduledEvent,
  CHourSource,
  /** S1: the commitment boundary, as observed by orchestration. */
  EventTiming,
} from './scenario';
export { scheduleEvents, eventsAt, classifyEventTiming } from './scenario';

export type {
  SongSnapshot,
  HourSnapshot,
  TraceLine,
  SimulationRun,
  InvariantViolation,
  SimulationMetrics,
  /** S1: an event that arrived after its hour was already committed. */
  LateEventReport,
} from './snapshot';
export { snapshotSong, totalPersistentKura } from './snapshot';

export type { SimulationResult, SimulationFailure } from './driver';
export { runSimulation, describeEvent } from './driver';

export { fingerprint, fingerprintHour, fingerprintText, runsIdentical, stable, FINGERPRINT_PRECISION } from './reproducibility';

export {
  plainSong,
  stateAt,
  votes,
  lowVotes,
  zeroBucket,
  runwayFrom,
  scenarioAEmptyChart,
  scenarioBSingleSong,
  scenarioCTwoSongs,
  scenarioDActualZeroReplacesSeed,
  scenarioDControl,
  scenarioESeedExpiration,
  scenarioFKuraDecay,
  scenarioGVaultRestore,
  scenarioHPlatforms,
  scenarioIRankingTieBreaks,
  scenarioJLongRun,
} from './scenarios';