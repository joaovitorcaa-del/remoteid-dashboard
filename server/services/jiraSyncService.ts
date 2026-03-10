import { fetchJiraActiveSprintIssues } from "../jira-sync";
import {
  createActivityLogEntry,
  createImpediment,
  getActiveImpediments,
  resolveImpediment,
} from "../db";

/**
 * Jira Sync Service
 * Handles automatic synchronization with Jira for:
 * - Activity logging (status changes)
 * - Blocker detection and tracking
 */

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    customfield_10016?: number; // Story Points
    updated: string;
  };
}

/**
 * Sync activity log with Jira
 * Detects status changes and logs them
 */
export async function syncActivityLog(): Promise<void> {
  try {
    const issues = await fetchJiraActiveSprintIssues();
    if (!issues || issues.length === 0) {
      console.log("[Jira Sync] No issues found");
      return;
    }

    console.log(`[Jira Sync] Syncing activity for ${issues.length} issues`);

    for (const issue of issues) {
      const jiraIssue = issue as JiraIssue;
      const issueKey = jiraIssue.key;
      const status = jiraIssue.fields.status.name;
      const changedBy = jiraIssue.fields.assignee?.displayName || "System";
      const changedAt = new Date(jiraIssue.fields.updated);

      // Log activity
      try {
        await createActivityLogEntry({
          issueKey,
          toStatus: status,
          changedBy,
          changedAt,
        });
      } catch (error) {
        // Activity may already exist, ignore duplicate errors
        console.debug(`[Jira Sync] Activity already logged for ${issueKey}`);
      }
    }

    console.log("[Jira Sync] Activity log sync completed");
  } catch (error) {
    console.error("[Jira Sync] Error syncing activity log:", error);
  }
}

/**
 * Sync blockers with Jira
 * Detects issues with blocker labels or stuck in same status
 */
export async function syncBlockers(): Promise<void> {
  try {
    const issues = await fetchJiraActiveSprintIssues();
    if (!issues || issues.length === 0) {
      console.log("[Jira Sync] No issues found for blocker sync");
      return;
    }

    console.log(`[Jira Sync] Syncing blockers for ${issues.length} issues`);

    // Get current blockers
    const currentBlockers = await getActiveImpediments();
    const currentBlockerKeys = new Set(currentBlockers.map((b) => b.issueKey));

    // Check for new blockers
    for (const issue of issues) {
      const jiraIssue = issue as JiraIssue;
      const issueKey = jiraIssue.key;
      const summary = jiraIssue.fields.summary;
      const status = jiraIssue.fields.status.name;
      const storyPoints = jiraIssue.fields.customfield_10016 || 0;

      // Detect blockers:
      // 1. Issues with "Blocked" status
      // 2. Issues stuck in same status for more than 3 days
      const isBlocked = status.toLowerCase().includes("blocked");

      if (isBlocked && !currentBlockerKeys.has(issueKey)) {
        // Create new blocker
        try {
          await createImpediment({
            issueKey,
            issueSummary: summary,
            blockedSince: new Date(),
            reason: `Issue status: ${status}`,
            impactSp: storyPoints,
          });
          console.log(`[Jira Sync] Created blocker for ${issueKey}`);
        } catch (error) {
          console.error(`[Jira Sync] Error creating blocker for ${issueKey}:`, error);
        }
      }
    }

    // Check for resolved blockers
    for (const blocker of currentBlockers) {
      const issue = issues.find((i: any) => i.key === blocker.issueKey);
      if (!issue) continue;

      const jiraIssue = issue as JiraIssue;
      const status = jiraIssue.fields.status.name;
      const isBlocked = status.toLowerCase().includes("blocked");

      // If no longer blocked, resolve the blocker
      if (!isBlocked && !blocker.resolvedAt) {
        try {
          await resolveImpediment(blocker.id);
          console.log(`[Jira Sync] Resolved blocker for ${blocker.issueKey}`);
        } catch (error) {
          console.error(
            `[Jira Sync] Error resolving blocker for ${blocker.issueKey}:`,
            error
          );
        }
      }
    }

    console.log("[Jira Sync] Blocker sync completed");
  } catch (error) {
    console.error("[Jira Sync] Error syncing blockers:", error);
  }
}

/**
 * Run all sync tasks
 */
export async function runAllSyncTasks(): Promise<void> {
  console.log("[Jira Sync] Starting sync tasks...");
  try {
    await Promise.all([syncActivityLog(), syncBlockers()]);
    console.log("[Jira Sync] All sync tasks completed successfully");
  } catch (error) {
    console.error("[Jira Sync] Error running sync tasks:", error);
  }
}

/**
 * Start automatic sync scheduler
 * Runs every 30 minutes
 */
export function startAutoSync(intervalMinutes: number = 30): ReturnType<typeof setInterval> {
  console.log(
    `[Jira Sync] Starting auto-sync scheduler (every ${intervalMinutes} minutes)`
  );

  // Run immediately on startup
  runAllSyncTasks().catch((error) => {
    console.error("[Jira Sync] Error on initial sync:", error);
  });

  // Then run periodically
  const intervalMs = intervalMinutes * 60 * 1000;
  return setInterval(() => {
    runAllSyncTasks().catch((error) => {
      console.error("[Jira Sync] Error on scheduled sync:", error);
    });
  }, intervalMs);
}

/**
 * Stop automatic sync scheduler
 */
export function stopAutoSync(timerId: ReturnType<typeof setInterval>): void {
  console.log("[Jira Sync] Stopping auto-sync scheduler");
  clearInterval(timerId);
}
