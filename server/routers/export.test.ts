import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
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
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("export.generatePDF", () => {
  it("should generate a PDF successfully", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const dashboardData = {
      metrics: {
        completionRate: 62.4,
        totalIssues: 125,
        doneIssues: 78,
        inProgressIssues: 47,
        canceledIssues: 0,
        qaGargaloCount: 25,
        devAndCodeReviewCount: 6,
        backlogCount: 0,
        projectHealth: "critical",
      },
      statusDistribution: [
        { status: "Done", count: 78 },
        { status: "In Progress", count: 47 },
        { status: "To Do", count: 0 },
      ],
      criticalIssues: [],
      impediments: [],
      nextSteps: [
        {
          title: "Aumentar Capacidade de QA",
          description: "Gargalo detectado em testes",
          priority: "high",
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    const result = await caller.export.generatePDF({
      dashboardData,
      fileName: "test-dashboard",
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toContain("test-dashboard");
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe("string");
    
    // Verificar se é base64 válido
    expect(() => atob(result.data)).not.toThrow();
    
    // Verificar se o base64 decodificado começa com PDF magic number
    const binaryString = atob(result.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // PDF magic number: %PDF
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P
    expect(bytes[2]).toBe(0x44); // D
    expect(bytes[3]).toBe(0x46); // F
  });

  it("should handle empty dashboard data", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.generatePDF({
      dashboardData: {},
      fileName: "empty-dashboard",
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toContain("empty-dashboard");
    expect(result.data).toBeDefined();
  });

  it("should use default fileName when not provided", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.generatePDF({
      dashboardData: { metrics: { totalIssues: 10 } },
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toContain("remoteid-dashboard");
  });
});
