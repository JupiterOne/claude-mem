import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SessionStore } from '../../src/services/sqlite/SessionStore.js';
import { ingestObservation, setIngestContext } from '../../src/services/worker/http/shared.js';
import type { ObservationData } from '../../src/services/worker-types.js';
import type { SessionManager } from '../../src/services/worker/SessionManager.js';
import type { DatabaseManager } from '../../src/services/worker/DatabaseManager.js';
import type { SessionEventBroadcaster } from '../../src/services/worker/events/SessionEventBroadcaster.js';

// PLATENG-1228 L1: OpenClaw gateway turns carry no workspaceDir, so the plugin
// sends no cwd — and a substituted one files observations under a project the
// inject path never queries. The session row already knows its project, so the
// worker resolves it from there instead of rejecting the observation.
describe('ingestObservation with no cwd', () => {
  let store: SessionStore;
  let projectsAtCreate: string[];
  let queued: Array<{ sessionDbId: number; data: ObservationData }>;

  beforeEach(() => {
    store = new SessionStore(':memory:');
    projectsAtCreate = [];
    queued = [];

    const create = store.createSDKSession.bind(store);
    store.createSDKSession = (contentSessionId, project, userPrompt, customTitle, platformSource) => {
      projectsAtCreate.push(project);
      return create(contentSessionId, project, userPrompt, customTitle, platformSource);
    };

    setIngestContext({
      sessionManager: {
        queueObservation: async (sessionDbId: number, data: ObservationData) => {
          queued.push({ sessionDbId, data });
        },
      } as unknown as SessionManager,
      dbManager: { getSessionStore: () => store } as unknown as DatabaseManager,
      eventBroadcaster: { broadcastObservationQueued: () => {} } as unknown as SessionEventBroadcaster,
    });
  });

  afterEach(() => {
    store.close();
  });

  it('files the observation under the project the session already resolved', async () => {
    const sessionDbId = store.createSDKSession('openclaw-agent:main:tick-1', 'openclaw-TD-10849', 'prompt');
    projectsAtCreate = [];

    const result = await ingestObservation({
      contentSessionId: 'openclaw-agent:main:tick-1',
      toolName: 'exec',
      toolInput: { command: 'ls' },
      toolResponse: 'a\nb',
    });

    expect(result.ok).toBe(true);
    expect(projectsAtCreate).toEqual(['openclaw-TD-10849']);
    expect(queued.map(q => q.sessionDbId)).toEqual([sessionDbId]);
  });

  it('still derives the project from cwd when the caller sends one', async () => {
    store.createSDKSession('openclaw-agent:main:tick-2', 'openclaw-TD-10849', 'prompt');
    projectsAtCreate = [];

    await ingestObservation({
      contentSessionId: 'openclaw-agent:main:tick-2',
      toolName: 'exec',
      toolInput: { command: 'ls' },
      toolResponse: 'ok',
      cwd: '/home/node/work/some-repo',
    });

    expect(projectsAtCreate).toEqual(['some-repo']);
  });

  it('queues the observation even when no session row exists yet', async () => {
    const result = await ingestObservation({
      contentSessionId: 'openclaw-agent:main:tick-3',
      toolName: 'exec',
      toolInput: { command: 'ls' },
      toolResponse: 'ok',
    });

    expect(result.ok).toBe(true);
    expect(queued).toHaveLength(1);
  });
});
