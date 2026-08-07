// PLATENG-1228 L1: re-key a session's project by content session id.
//
// Extracted from the route handler so the DB re-key + live-session refresh can
// be unit-tested without booting the worker HTTP server (mirrors how the
// observations route delegates to ingestObservation).

export interface ReprojectSessionStore {
  updateSessionProject(contentSessionId: string, project: string, platformSource?: string): number | null;
}

/** Minimal view of an in-memory ActiveSession — only its mutable project. */
export interface LiveSessionProject {
  project: string;
}

export interface ReprojectSessionInput {
  contentSessionId: string;
  project: string;
  platformSource?: string;
}

export interface ReprojectSessionResult {
  updated: boolean;
  sessionDbId?: number;
  project?: string;
  reason?: string;
}

/**
 * Re-key the persisted session, then refresh the resident session if one is
 * loaded. The live refresh is load-bearing: ResponseProcessor stamps each
 * observation from the in-memory ActiveSession.project, so a DB-only update
 * would leave the current run's remaining observations under the old project.
 */
export function reprojectSession(
  store: ReprojectSessionStore,
  getLiveSession: (sessionDbId: number) => LiveSessionProject | undefined,
  input: ReprojectSessionInput,
): ReprojectSessionResult {
  const sessionDbId = store.updateSessionProject(input.contentSessionId, input.project, input.platformSource);
  if (sessionDbId === null) {
    return { updated: false, reason: 'session_not_found' };
  }

  const live = getLiveSession(sessionDbId);
  if (live) {
    live.project = input.project;
  }

  return { updated: true, sessionDbId, project: input.project };
}
