import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTicketFromPrompt,
  extractTicketFromParams,
  ticketProject,
} from './ticket-scope.js';

describe('ticketProject', () => {
  it('formats a ticket into the openclaw project convention', () => {
    assert.equal(ticketProject('TD-1234'), 'openclaw-TD-1234');
  });
});

describe('extractTicketFromPrompt', () => {
  it('extracts the ticket from a specialist spawn prompt', () => {
    const prompt = 'You are the new-step-reviewer for ticket TD-1234. Review the diff.';
    assert.equal(extractTicketFromPrompt(prompt), 'TD-1234');
  });

  it('returns null when the prompt names no ticket', () => {
    assert.equal(extractTicketFromPrompt('Select the next integration to build.'), null);
  });

  it('returns null for a non-string prompt', () => {
    assert.equal(extractTicketFromPrompt(undefined), null);
  });
});

describe('extractTicketFromParams', () => {
  it('extracts the ticket from a worktree path in params.command', () => {
    const params = { command: 'cd /home/node/work/.integrations-worktrees/TD-1234/repo && npm test' };
    assert.equal(extractTicketFromParams(params), 'TD-1234');
  });

  it('finds the worktree path in a non-command string field', () => {
    const params = { workdir: '/home/node/work/.integrations-worktrees/TD-2001/graph-acme' };
    assert.equal(extractTicketFromParams(params), 'TD-2001');
  });

  it('tolerates the worktree prefix variant without /work/', () => {
    const params = { command: 'cd /home/node/.integrations-worktrees/TD-6523 && git status' };
    assert.equal(extractTicketFromParams(params), 'TD-6523');
  });

  it('extracts the ticket from a web-app worktree path', () => {
    const params = { command: 'cd /home/node/work/.web-app-worktrees/TD-9876/web-app && npm run lint' };
    assert.equal(extractTicketFromParams(params), 'TD-9876');
  });

  it('extracts the ticket from a docs worktree path', () => {
    const params = { command: 'cd /home/node/work/.docs-worktrees/TD-5555/docs && git diff' };
    assert.equal(extractTicketFromParams(params), 'TD-5555');
  });

  it('extracts the ticket from a trash worktree path', () => {
    const params = { workdir: '/home/node/work/.trash-worktrees/TD-4321/graph-acme' };
    assert.equal(extractTicketFromParams(params), 'TD-4321');
  });

  it('ignores an incidental TD-#### not under a worktree path', () => {
    const params = { command: 'echo "resolves TD-9999" >> notes.txt' };
    assert.equal(extractTicketFromParams(params), null);
  });

  it('ignores an incidental TD-#### in a git command', () => {
    const params = { command: 'git log --grep TD-1234' };
    assert.equal(extractTicketFromParams(params), null);
  });

  it('returns null when params is not an object', () => {
    assert.equal(extractTicketFromParams(null), null);
  });
});
