import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  createDailyMeeting,
  updateDailyMeeting,
  getDailyMeetingById,
  listDailyMeetings,
  upsertDailyDevTurn,
  getDailyDevTurnsByMeetingId,
  getDb,
} from '../db';
import { dailyMeetings, dailyDevTurns } from '../../drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

// ─── Input Schemas ─────────────────────────────────────────────────────────────

const devTurnSchema = z.object({
  devName: z.string(),
  devId: z.string().optional(),
  currentTask: z.string().optional().default(''),
  currentTaskComment: z.string().optional().default(''),
  nextTask: z.string().optional().default(''),
  nextTaskComment: z.string().optional().default(''),
  hasImpediment: z.boolean().default(false),
  impedimentIssue: z.string().optional().default(''),
  impedimentComment: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  issuesData: z.array(z.object({
    key: z.string(),
    title: z.string(),
    status: z.string(),
    lastUpdate: z.string(),
  })).optional().default([]),
  registered: z.boolean().default(false),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const dailyHistoryRouter = router({

  /**
   * Start a new daily meeting session - creates a record in DB
   */
  startMeeting: protectedProcedure
    .input(z.object({
      meetingDate: z.string(), // YYYY-MM-DD
      jqlUsed: z.string().optional(),
      totalDevs: z.number().default(0),
      metricsSnapshot: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const meetingId = await createDailyMeeting({
        meetingDate: input.meetingDate as unknown as Date,
        jqlUsed: input.jqlUsed ?? null,
        durationSeconds: 0,
        totalDevs: input.totalDevs,
        registeredDevs: 0,
        silentDevs: [],
        aiReport: null,
        metricsSnapshot: input.metricsSnapshot ?? null,
        status: 'in_progress',
        createdBy: ctx.user.id,
      });

      return { meetingId };
    }),

  /**
   * Save a developer turn (called when clicking "Registrar Daily")
   */
  saveTurn: protectedProcedure
    .input(z.object({
      meetingId: z.number(),
      turn: devTurnSchema,
    }))
    .mutation(async ({ input }) => {
      const turnId = await upsertDailyDevTurn(input.meetingId, input.turn.devName, {
        devId: input.turn.devId ?? null,
        currentTask: input.turn.currentTask || null,
        currentTaskComment: input.turn.currentTaskComment || null,
        nextTask: input.turn.nextTask || null,
        nextTaskComment: input.turn.nextTaskComment || null,
        hasImpediment: input.turn.hasImpediment ? 1 : 0,
        impedimentIssue: input.turn.impedimentIssue || null,
        impedimentComment: input.turn.impedimentComment || null,
        summary: input.turn.summary || null,
        issuesData: input.turn.issuesData,
        registered: input.turn.registered ? 1 : 0,
      });

      return { turnId };
    }),

  /**
   * Conclude a daily meeting - saves final state with AI report and duration
   */
  concludeMeeting: protectedProcedure
    .input(z.object({
      meetingId: z.number(),
      durationSeconds: z.number(),
      registeredDevs: z.number(),
      silentDevs: z.array(z.string()),
      aiReport: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await updateDailyMeeting(input.meetingId, {
        durationSeconds: input.durationSeconds,
        registeredDevs: input.registeredDevs,
        silentDevs: input.silentDevs,
        aiReport: input.aiReport ?? null,
        status: 'concluded',
      });

      return { success: true };
    }),

  /**
   * List all daily meetings (for history page)
   */
  listMeetings: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return listDailyMeetings(input.limit, input.offset);
    }),

  /**
   * Get a single meeting with all dev turns
   */
  getMeetingDetail: protectedProcedure
    .input(z.object({ meetingId: z.number() }))
    .query(async ({ input }) => {
      const meeting = await getDailyMeetingById(input.meetingId);
      if (!meeting) return null;

      const turns = await getDailyDevTurnsByMeetingId(input.meetingId);
      return { meeting, turns };
    }),

  /**
   * Get meeting for a specific date (if exists)
   */
  getMeetingByDate: protectedProcedure
    .input(z.object({ date: z.string() })) // YYYY-MM-DD
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const meetings = await db
        .select()
        .from(dailyMeetings)
        .where(sql`${dailyMeetings.meetingDate} = ${input.date}`)
        .orderBy(desc(dailyMeetings.createdAt))
        .limit(1);

      if (meetings.length === 0) return null;

      const meeting = meetings[0];
      const turns = await getDailyDevTurnsByMeetingId(meeting.id);

      return { meeting, turns };
    }),

  /**
   * Get impediment history - all turns with impediments
   */
  getImpedimentHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const turns = await db
        .select({
          id: dailyDevTurns.id,
          devName: dailyDevTurns.devName,
          impedimentIssue: dailyDevTurns.impedimentIssue,
          impedimentComment: dailyDevTurns.impedimentComment,
          summary: dailyDevTurns.summary,
          meetingDate: dailyMeetings.meetingDate,
          meetingId: dailyMeetings.id,
        })
        .from(dailyDevTurns)
        .innerJoin(dailyMeetings, eq(dailyDevTurns.meetingId, dailyMeetings.id))
        .where(eq(dailyDevTurns.hasImpediment, 1))
        .orderBy(desc(dailyMeetings.meetingDate))
        .limit(input.limit);

      return turns;
    }),

  /**
   * Get developer participation stats
   */
  getDevStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const turns = await db
        .select({
          devName: dailyDevTurns.devName,
          registered: dailyDevTurns.registered,
          hasImpediment: dailyDevTurns.hasImpediment,
          meetingDate: dailyMeetings.meetingDate,
        })
        .from(dailyDevTurns)
        .innerJoin(dailyMeetings, eq(dailyDevTurns.meetingId, dailyMeetings.id))
        .where(eq(dailyMeetings.status, 'concluded'))
        .orderBy(dailyDevTurns.devName);

      // Aggregate per developer
      const statsMap = new Map<string, {
        devName: string;
        totalTurns: number;
        registeredTurns: number;
        impedimentCount: number;
      }>();

      for (const turn of turns) {
        const existing = statsMap.get(turn.devName) ?? {
          devName: turn.devName,
          totalTurns: 0,
          registeredTurns: 0,
          impedimentCount: 0,
        };
        existing.totalTurns++;
        if (turn.registered) existing.registeredTurns++;
        if (turn.hasImpediment) existing.impedimentCount++;
        statsMap.set(turn.devName, existing);
      }

      return Array.from(statsMap.values()).sort((a, b) =>
        b.registeredTurns - a.registeredTurns
      );
    }),
});
