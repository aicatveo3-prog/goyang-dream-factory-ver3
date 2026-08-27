import { describe, expect, it } from "vitest";
import { canNativeShareArRecord } from "../client/src/lib/arRecord";

const sampleFile = { name: "youth-echo-ar.png", type: "image/png" } as File;

describe("AR 기록 공유 지원 판정", () => {
  it("공유 API와 파일 공유 지원이 있으면 시스템 공유를 사용한다", () => {
    const navigatorLike = {
      share: async () => undefined,
      canShare: () => true,
    } as Navigator;

    expect(canNativeShareArRecord(sampleFile, navigatorLike)).toBe(true);
  });

  it("파일 공유를 지원하지 않으면 이미지 저장으로 대체한다", () => {
    const navigatorLike = {
      share: async () => undefined,
      canShare: () => false,
    } as Navigator;

    expect(canNativeShareArRecord(sampleFile, navigatorLike)).toBe(false);
  });
});
