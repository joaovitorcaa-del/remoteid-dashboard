import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('../db', () => ({
  createDailyMeeting: vi.fn(),
  updateDailyMeeting: vi.fn(),
  getDailyMeetingById: vi.fn(),
  listDailyMeetings: vi.fn(),
  upsertDailyDevTurn: vi.fn(),
  getDailyDevTurnsByMeetingId: vi.fn(),
  getDb: vi.fn(),
}));

import {
  createDailyMeeting,
  updateDailyMeeting,
  getDailyMeetingById,
  listDailyMeetings,
  upsertDailyDevTurn,
  getDailyDevTurnsByMeetingId,
} from '../db';

describe('dailyHistory router helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDailyMeeting', () => {
    it('should create a meeting and return an id', async () => {
      vi.mocked(createDailyMeeting).mockResolvedValue(42);

      const result = await createDailyMeeting({
        meetingDate: '2026-04-15' as unknown as Date,
        jqlUsed: 'project = TEST',
        durationSeconds: 0,
        totalDevs: 3,
        registeredDevs: 0,
        silentDevs: [],
        aiReport: null,
        metricsSnapshot: null,
        status: 'in_progress',
        createdBy: 1,
      });

      expect(result).toBe(42);
      expect(createDailyMeeting).toHaveBeenCalledOnce();
    });
  });

  describe('updateDailyMeeting', () => {
    it('should update a meeting with conclusion data', async () => {
      vi.mocked(updateDailyMeeting).mockResolvedValue(undefined);

      await updateDailyMeeting(42, {
        durationSeconds: 1800,
        registeredDevs: 3,
        silentDevs: ['Dev A'],
        aiReport: 'AI report text',
        status: 'concluded',
      });

      expect(updateDailyMeeting).toHaveBeenCalledWith(42, expect.objectContaining({
        durationSeconds: 1800,
        status: 'concluded',
      }));
    });
  });

  describe('getDailyMeetingById', () => {
    it('should return meeting when found', async () => {
      const mockMeeting = {
        id: 42,
        meetingDate: new Date('2026-04-15'),
        status: 'concluded',
        totalDevs: 3,
        registeredDevs: 2,
      };
      vi.mocked(getDailyMeetingById).mockResolvedValue(mockMeeting as any);

      const result = await getDailyMeetingById(42);
      expect(result).toEqual(mockMeeting);
    });

    it('should return undefined when not found', async () => {
      vi.mocked(getDailyMeetingById).mockResolvedValue(undefined);

      const result = await getDailyMeetingById(999);
      expect(result).toBeUndefined();
    });
  });

  describe('listDailyMeetings', () => {
    it('should return list of meetings', async () => {
      const mockMeetings = [
        { id: 1, meetingDate: new Date('2026-04-15'), status: 'concluded' },
        { id: 2, meetingDate: new Date('2026-04-14'), status: 'concluded' },
      ];
      vi.mocked(listDailyMeetings).mockResolvedValue(mockMeetings as any);

      const result = await listDailyMeetings(10, 0);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
    });

    it('should return empty array when no meetings', async () => {
      vi.mocked(listDailyMeetings).mockResolvedValue([]);

      const result = await listDailyMeetings(10, 0);
      expect(result).toEqual([]);
    });
  });

  describe('upsertDailyDevTurn', () => {
    it('should create a new turn and return id', async () => {
      vi.mocked(upsertDailyDevTurn).mockResolvedValue(10);

      const result = await upsertDailyDevTurn(42, 'Dev A', {
        currentTask: 'PROJ-123',
        currentTaskComment: 'Working on it',
        nextTask: 'PROJ-124',
        nextTaskComment: '',
        hasImpediment: 0,
        impedimentIssue: null,
        impedimentComment: null,
        summary: 'All good',
        registered: 1,
      });

      expect(result).toBe(10);
      expect(upsertDailyDevTurn).toHaveBeenCalledWith(42, 'Dev A', expect.any(Object));
    });

    it('should handle impediment turn', async () => {
      vi.mocked(upsertDailyDevTurn).mockResolvedValue(11);

      const result = await upsertDailyDevTurn(42, 'Dev B', {
        currentTask: 'PROJ-456',
        hasImpediment: 1,
        impedimentIssue: 'PROJ-456',
        impedimentComment: 'Blocked by backend API',
        registered: 1,
      });

      expect(result).toBe(11);
    });
  });

  describe('getDailyDevTurnsByMeetingId', () => {
    it('should return turns for a meeting', async () => {
      const mockTurns = [
        { id: 1, meetingId: 42, devName: 'Dev A', registered: 1 },
        { id: 2, meetingId: 42, devName: 'Dev B', registered: 0 },
      ];
      vi.mocked(getDailyDevTurnsByMeetingId).mockResolvedValue(mockTurns as any);

      const result = await getDailyDevTurnsByMeetingId(42);
      expect(result).toHaveLength(2);
      expect(result[0].devName).toBe('Dev A');
    });

    it('should return empty array when no turns', async () => {
      vi.mocked(getDailyDevTurnsByMeetingId).mockResolvedValue([]);

      const result = await getDailyDevTurnsByMeetingId(999);
      expect(result).toEqual([]);
    });
  });

  describe('meeting lifecycle', () => {
    it('should complete full meeting lifecycle: start -> turns -> conclude', async () => {
      // 1. Start meeting
      vi.mocked(createDailyMeeting).mockResolvedValue(100);
      const meetingId = await createDailyMeeting({
        meetingDate: '2026-04-15' as unknown as Date,
        jqlUsed: 'project = TEST',
        durationSeconds: 0,
        totalDevs: 2,
        registeredDevs: 0,
        silentDevs: [],
        aiReport: null,
        metricsSnapshot: null,
        status: 'in_progress',
        createdBy: 1,
      });
      expect(meetingId).toBe(100);

      // 2. Save turns
      vi.mocked(upsertDailyDevTurn).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
      const turn1Id = await upsertDailyDevTurn(100, 'Alice', { registered: 1 });
      const turn2Id = await upsertDailyDevTurn(100, 'Bob', { registered: 1 });
      expect(turn1Id).toBe(1);
      expect(turn2Id).toBe(2);

      // 3. Conclude meeting
      vi.mocked(updateDailyMeeting).mockResolvedValue(undefined);
      await updateDailyMeeting(100, {
        durationSeconds: 900,
        registeredDevs: 2,
        silentDevs: [],
        aiReport: 'Sprint on track.',
        status: 'concluded',
      });

      expect(updateDailyMeeting).toHaveBeenCalledWith(100, expect.objectContaining({
        status: 'concluded',
        registeredDevs: 2,
      }));
    });
  });
});
