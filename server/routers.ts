import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getCompletionCodeStatus, issueCompletionCode, redeemCompletionCode } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

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
  completionCode: router({
    /** 운영자 로그인 후, 현장에서 완주 화면과 종이 입장권을 확인한 뒤에만 발급한다. */
    issue: adminProcedure
      .input(z.object({ participationToken: z.string().trim().min(8).max(80), validHours: z.number().int().min(1).max(72).default(24) }))
      .mutation(async ({ input }) => issueCompletionCode(input.participationToken, new Date(Date.now() + input.validHours * 60 * 60 * 1000))),
    /** 경품 데스크에서 코드를 한 번만 사용 처리한다. */
    redeem: adminProcedure
      .input(z.object({ code: z.string().trim().min(8).max(32) }))
      .mutation(async ({ input }) => redeemCompletionCode(input.code)),
    /** 코드 상태 확인은 운영자만 가능하며, 참가자 데이터는 반환하지 않는다. */
    status: adminProcedure
      .input(z.object({ code: z.string().trim().min(8).max(32) }))
      .query(async ({ input }) => getCompletionCodeStatus(input.code)),
  }),
});

export type AppRouter = typeof appRouter;
