import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { exportRouter } from "./routers/export";
import { aiRouter } from "./routers/ai";
import { sprintsRouter } from "./routers/sprints";
import { issuesRouter } from "./routers/issues";
import { jiraRouter } from "./routers/jira";
import { jqlFiltersRouter } from "./routers/jqlFilters";
import { dailyRouter } from "./routers/daily";
import { dashboardRouter } from "./routers/dashboard";
import { retrospectiveRouter } from "./routers/retrospective";
import { responsibleRouter } from "./routers/responsible";
import { analysisRouter } from "./routers/analysis";
import { dailyHistoryRouter } from "./routers/dailyHistory";
import { dailyMeetingRouter } from "./routers/dailyMeeting";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  export: exportRouter,
  ai: aiRouter,
  sprints: sprintsRouter,
  issues: issuesRouter,
  jira: jiraRouter,
  jqlFilters: jqlFiltersRouter,
  daily: dailyRouter,
  dashboard: dashboardRouter,
  retrospective: retrospectiveRouter,
  responsible: responsibleRouter,
  analysis: analysisRouter,
  dailyHistory: dailyHistoryRouter,
  dailyMeeting: dailyMeetingRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
