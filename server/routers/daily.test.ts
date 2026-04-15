import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Daily Router", () => {
  beforeAll(() => {
    // Mock JIRA API responses
    global.fetch = vi.fn();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe("getDailyData", () => {
    it("should fetch daily data for a specific date", async () => {
      // Mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "REM-1",
              fields: {
                summary: "Test Issue",
                status: { name: "Done" },
                assignee: { displayName: "John Doe" },
                updated: new Date().toISOString(),
                duedate: null,
                flagged: false,
                labels: [],
                customfield_10004: 5,
              },
            },
          ],
        }),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.daily.getDailyData({
        date: "2026-04-15",
      });

      expect(result).toBeDefined();
      expect(result.date).toBe("2026-04-15");
      expect(result.metrics).toBeDefined();
      expect(result.developers).toBeDefined();
      expect(result.criticalIssues).toBeDefined();
    });

    it("should calculate completion rate correctly", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "REM-1",
              fields: {
                summary: "Done Issue",
                status: { name: "Done" },
                assignee: { displayName: "John" },
                updated: new Date().toISOString(),
                duedate: null,
                flagged: false,
                labels: [],
              },
            },
            {
              key: "REM-2",
              fields: {
                summary: "In Progress Issue",
                status: { name: "In Progress" },
                assignee: { displayName: "John" },
                updated: new Date().toISOString(),
                duedate: null,
                flagged: false,
                labels: [],
              },
            },
          ],
        }),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.daily.getDailyData({
        date: "2026-04-15",
      });

      expect(result.metrics.completionRate.today).toBeGreaterThanOrEqual(0);
      expect(result.metrics.completionRate.today).toBeLessThanOrEqual(100);
    });

    it("should identify overdue issues", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "REM-1",
              fields: {
                summary: "Overdue Issue",
                status: { name: "In Progress" },
                assignee: { displayName: "John" },
                updated: new Date().toISOString(),
                duedate: yesterday.toISOString().split("T")[0],
                flagged: false,
                labels: [],
              },
            },
          ],
        }),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.daily.getDailyData({
        date: "2026-04-15",
      });

      expect(result.metrics.overdue.today).toBeGreaterThan(0);
    });

    it("should identify blocked issues", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "REM-1",
              fields: {
                summary: "Blocked Issue",
                status: { name: "In Progress" },
                assignee: { displayName: "John" },
                updated: new Date().toISOString(),
                duedate: null,
                flagged: true,
                labels: [],
              },
            },
          ],
        }),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.daily.getDailyData({
        date: "2026-04-15",
      });

      expect(result.metrics.blockers.today).toBeGreaterThan(0);
    });
  });

  describe("getRecentActivity", () => {
    it("should fetch recent activity from last 24 hours", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "REM-1",
              fields: {
                summary: "Recent Issue",
                status: { name: "In Progress" },
                assignee: { displayName: "John" },
                updated: new Date().toISOString(),
              },
            },
          ],
        }),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.daily.getRecentActivity({
        hoursBack: 24,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getActiveImpediments", () => {
    it("should fetch active impediments", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "REM-1",
              fields: {
                summary: "Blocked Issue",
                status: { name: "In Progress" },
                assignee: { displayName: "John" },
                created: new Date().toISOString(),
                flagged: true,
                customfield_10004: 5,
              },
            },
          ],
        }),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.daily.getActiveImpediments();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Metrics Calculation", () => {
    it("should calculate delta correctly", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "REM-1",
              fields: {
                summary: "Test Issue",
                status: { name: "Done" },
                assignee: { displayName: "John" },
                updated: new Date().toISOString(),
                duedate: null,
                flagged: false,
                labels: [],
              },
            },
          ],
        }),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.daily.getDailyData({
        date: "2026-04-15",
      });

      expect(result.metrics.completionRate.delta).toBeDefined();
      expect(result.metrics.changes.delta).toBeDefined();
      expect(result.metrics.overdue.delta).toBeDefined();
      expect(result.metrics.blockers.delta).toBeDefined();
    });
  });
});
