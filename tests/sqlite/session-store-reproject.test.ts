import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SessionStore } from '../../src/services/sqlite/SessionStore.js';

// PLATENG-1228 L1: updateSessionProject re-keys a session's project by content
// session id. Unlike createSDKSession's NULL/empty-guarded backfill, it
// overwrites an already-set project (openclaw-{agentId} -> openclaw-TD-####).
describe('SessionStore.updateSessionProject', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('unconditionally re-keys an already-set project and returns the row id', () => {
    const id = store.createSDKSession('content-1', 'openclaw-new-step-coder', 'prompt');
    const updated = store.updateSessionProject('content-1', 'openclaw-TD-1234');

    expect(updated).toBe(id);
    expect(store.getSessionById(id)?.project).toBe('openclaw-TD-1234');
  });

  it('returns null when no session exists for the content session id', () => {
    expect(store.updateSessionProject('missing', 'openclaw-TD-1')).toBeNull();
  });

  it('overwrites where a createSDKSession re-init cannot (non-empty project backfill is a no-op)', () => {
    const id = store.createSDKSession('content-2', 'openclaw-orchestrator', 'prompt');

    // A plain re-init does NOT re-key: createSDKSession only backfills NULL/'' projects.
    store.createSDKSession('content-2', 'openclaw-TD-9', 'prompt');
    expect(store.getSessionById(id)?.project).toBe('openclaw-orchestrator');

    // updateSessionProject is the unconditional re-key the design requires.
    store.updateSessionProject('content-2', 'openclaw-TD-9');
    expect(store.getSessionById(id)?.project).toBe('openclaw-TD-9');
  });

  it('resolves the row scoped by platform_source', () => {
    const id = store.createSDKSession('content-3', 'openclaw-x', 'prompt', undefined, 'slack');
    const updated = store.updateSessionProject('content-3', 'openclaw-TD-3', 'slack');

    expect(updated).toBe(id);
    expect(store.getSessionById(id)?.project).toBe('openclaw-TD-3');
  });
});
