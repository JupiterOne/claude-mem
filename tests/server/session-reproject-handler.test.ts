import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SessionStore } from '../../src/services/sqlite/SessionStore.js';
import { reprojectSession } from '../../src/services/worker/http/reproject-session.js';

// PLATENG-1228 L1: the reproject handler logic. A DB UPDATE alone is
// insufficient — ResponseProcessor stamps observations from the in-memory
// ActiveSession.project, so a resident session must also be refreshed.
describe('reprojectSession', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('re-keys the DB row and refreshes the live session', () => {
    const id = store.createSDKSession('c1', 'openclaw-new-step-coder', 'p');
    const live = { project: 'openclaw-new-step-coder' };

    const result = reprojectSession(
      store,
      (dbId) => (dbId === id ? live : undefined),
      { contentSessionId: 'c1', project: 'openclaw-TD-1234' },
    );

    expect(result).toEqual({ updated: true, sessionDbId: id, project: 'openclaw-TD-1234' });
    expect(store.getSessionById(id)?.project).toBe('openclaw-TD-1234');
    expect(live.project).toBe('openclaw-TD-1234');
  });

  it('reports session_not_found without looking up a live session', () => {
    let lookedUp = false;

    const result = reprojectSession(
      store,
      () => { lookedUp = true; return undefined; },
      { contentSessionId: 'missing', project: 'openclaw-TD-1' },
    );

    expect(result).toEqual({ updated: false, reason: 'session_not_found' });
    expect(lookedUp).toBe(false);
  });

  it('re-keys the DB even when no live session is resident', () => {
    const id = store.createSDKSession('c2', 'openclaw-x', 'p');

    const result = reprojectSession(
      store,
      () => undefined,
      { contentSessionId: 'c2', project: 'openclaw-TD-9' },
    );

    expect(result.updated).toBe(true);
    expect(store.getSessionById(id)?.project).toBe('openclaw-TD-9');
  });
});
