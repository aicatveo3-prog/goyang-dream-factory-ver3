type ArRecordInput = {
  video: HTMLVideoElement | null;
  portrait: string;
  name: string;
  attribute: string;
  place: string;
};

type ShareNavigator = Pick<Navigator, "share" | "canShare">;

const WIDTH = 1080;
const HEIGHT = 1920;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const scale = Math.max(WIDTH / sourceWidth, HEIGHT / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  ctx.drawImage(source, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
}

export async function createArRecord(input: ArRecordInput): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 준비할 수 없습니다.");

  const { video } = input;
  if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
    drawCover(ctx, video, video.videoWidth, video.videoHeight);
  } else {
    ctx.fillStyle = "#1d4556";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const shade = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  shade.addColorStop(0, "rgba(29,69,86,0.18)");
  shade.addColorStop(0.5, "rgba(29,69,86,0.02)");
  shade.addColorStop(1, "rgba(29,69,86,0.78)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  try {
    const portrait = await loadImage(input.portrait);
    const ratio = Math.min(690 / portrait.width, 1040 / portrait.height);
    const portraitWidth = portrait.width * ratio;
    const portraitHeight = portrait.height * ratio;
    ctx.save();
    ctx.shadowColor = "rgba(10,36,46,0.62)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 18;
    ctx.drawImage(portrait, (WIDTH - portraitWidth) / 2, 420, portraitWidth, portraitHeight);
    ctx.restore();
  } catch {
    // 이미지 로드가 제한된 브라우저에서도 배경 기록은 저장할 수 있다.
  }

  ctx.fillStyle = "rgba(247,241,227,0.94)";
  ctx.fillRect(52, 50, 976, 102);
  ctx.strokeStyle = "#75afa7";
  ctx.lineWidth = 5;
  ctx.strokeRect(52, 50, 976, 102);
  ctx.fillStyle = "#1d4556";
  ctx.font = "700 25px monospace";
  ctx.fillText("YOUTH ECHO  /  FIELD AR RECORD", 82, 93);
  ctx.fillStyle = "#c9905f";
  ctx.font = "700 21px monospace";
  ctx.fillText("DREAM WORKSHOP", 82, 125);

  ctx.fillStyle = "rgba(247,241,227,0.95)";
  ctx.fillRect(52, 1552, 976, 280);
  ctx.strokeStyle = "#1d4556";
  ctx.lineWidth = 5;
  ctx.strokeRect(52, 1552, 976, 280);
  ctx.fillStyle = "#75afa7";
  ctx.font = "700 22px monospace";
  ctx.fillText(`ATTRIBUTE  /  ${input.attribute}`, 84, 1605);
  ctx.fillStyle = "#1d4556";
  ctx.font = "900 58px sans-serif";
  ctx.fillText(input.name, 84, 1685);
  ctx.font = "400 29px sans-serif";
  ctx.fillText(`현장 조우 기록 · ${input.place}`, 84, 1740);
  ctx.font = "400 21px monospace";
  ctx.fillStyle = "#1d4556";
  ctx.fillText("청년과 함께 다음 배틀을 준비합니다.", 84, 1790);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => (result ? resolve(result) : reject(new Error("이미지 생성에 실패했습니다."))), "image/png");
  });
  return new File([blob], `youth-echo-ar-${Date.now()}.png`, { type: "image/png" });
}

export function downloadArRecord(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canNativeShareArRecord(file: File, navigatorLike: ShareNavigator = navigator) {
  return typeof navigatorLike.share === "function" && (!navigatorLike.canShare || navigatorLike.canShare({ files: [file] }));
}
