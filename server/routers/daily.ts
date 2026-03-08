import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getActiveImpediments,
  createImpediment,
  updateImpediment,
  resolveImpediment,
  deleteImpediment,
  getRecentActivity,
  createActivityLogEntry,
  createDailySnapshot,
  getDailySnapshotsBySprintId,
  getLatestDailySnapshot,
} from "../db";

export const dailyRouter = router({
  // Impediments
  getActiveImpediments: protectedProcedure.query(async () => {
    return await getActiveImpediments();
  }),

  createImpediment: protectedProcedure
    .input(
      z.object({
        issueKey: z.string(),
        issueSummary: z.string().optional(),
        blockedSince: z.date(),
        reason: z.string().optional(),
        impactSp: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createImpediment({
        issueKey: input.issueKey,
        issueSummary: input.issueSummary,
        blockedSince: input.blockedSince,
        reason: input.reason,
        impactSp: input.impactSp,
      });
    }),

  updateImpediment: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
        impactSp: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await updateImpediment(input.id, {
        reason: input.reason,
        impactSp: input.impactSp,
      });
    }),

  resolveImpediment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await resolveImpediment(input.id);
    }),

  deleteImpediment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteImpediment(input.id);
    }),

  // Activity Log
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        hoursBack: z.number().optional().default(24),
      })
    )
    .query(async ({ input }) => {
      return await getRecentActivity(input.hoursBack);
    }),

  logActivity: protectedProcedure
    .input(
      z.object({
        issueKey: z.string(),
        fromStatus: z.string().optional(),
        toStatus: z.string().optional(),
        changedBy: z.string().optional(),
        changedAt: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      return await createActivityLogEntry({
        issueKey: input.issueKey,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        changedBy: input.changedBy,
        changedAt: input.changedAt,
      });
    }),

  // Daily Snapshots
  createSnapshot: protectedProcedure
    .input(
      z.object({
        sprintId: z.number(),
        snapshotDate: z.date(),
        totalSp: z.number().optional(),
        completedSp: z.number().optional(),
        inProgressSp: z.number().optional(),
        blockedCount: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createDailySnapshot({
        sprintId: input.sprintId,
        snapshotDate: input.snapshotDate,
        totalSp: input.totalSp,
        completedSp: input.completedSp,
        inProgressSp: input.inProgressSp,
        blockedCount: input.blockedCount,
      });
    }),

  getSnapshotsBySprintId: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      return await getDailySnapshotsBySprintId(input.sprintId);
    }),

  getLatestSnapshot: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      return await getLatestDailySnapshot(input.sprintId);
    }),
});
