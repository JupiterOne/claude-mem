// PLATENG-1228 L1: derive a durable per-build memory scope from the JIRA ticket
// so every isolated tick + spawned specialist of one jupiterclaw integration
// build shares a single claude-mem thread (project = openclaw-TD-####).
//
// Two discovery sources: specialists carry the ticket in their spawn prompt;
// the orchestrator only references it via the worktree path in exec commands.
// The worktree matcher is anchored on ".integrations-worktrees/" so incidental
// "TD-####" mentions in command text or output do not falsely re-key a build.

/** Bare ticket reference — used only for specialist spawn prompts. */
export const TICKET_IN_PROMPT = /\b(TD-\d+)\b/;

/** Ticket anchored to an integration worktree path — used for exec params. */
export const TICKET_IN_WORKTREE = /\.integrations-worktrees\/(TD-\d+)/;

/** Format a ticket into the claude-mem `openclaw-` project convention. */
export function ticketProject(ticket: string): string {
  return `openclaw-${ticket}`;
}

/** Extract the ticket from a specialist's spawn prompt, or null. */
export function extractTicketFromPrompt(prompt: unknown): string | null {
  if (typeof prompt !== 'string') return null;
  return prompt.match(TICKET_IN_PROMPT)?.[1] ?? null;
}

/**
 * Extract the ticket from a tool-params object by finding an integration
 * worktree path — params.command first, then any other string leaf. Returns
 * null if no worktree-anchored ticket is present.
 */
export function extractTicketFromParams(params: unknown): string | null {
  if (!params || typeof params !== 'object') return null;
  const matchWorktree = (v: unknown): string | null =>
    typeof v === 'string' ? (v.match(TICKET_IN_WORKTREE)?.[1] ?? null) : null;

  const p = params as Record<string, unknown>;
  const fromCommand = matchWorktree(p.command);
  if (fromCommand) return fromCommand;

  for (const value of Object.values(p)) {
    const hit = matchWorktree(value);
    if (hit) return hit;
  }
  return null;
}
