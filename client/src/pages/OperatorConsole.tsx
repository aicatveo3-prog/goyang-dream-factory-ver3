import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardCheck, Gift, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";

function OperatorWorkspace() {
  const { user, loading } = useAuth();
  const [entryToken, setEntryToken] = useState("");
  const [prizeCode, setPrizeCode] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [message, setMessage] = useState("현장 입장권과 완주 화면을 확인한 뒤 코드를 발급하세요.");
  const issue = trpc.completionCode.issue.useMutation({ onSuccess: result => {
    if (result.state === "issued") { setIssued(result.code); setMessage("익명 1회용 완주 코드가 발급되었습니다."); }
    else setMessage("이 입장권에는 이미 코드가 발급되었습니다.");
  }, onError: () => setMessage("발급에 실패했습니다. 운영자 권한과 입장권 번호를 확인하세요.") });
  const redeem = trpc.completionCode.redeem.useMutation({ onSuccess: result => {
    const copy = { redeemed: "경품 수령 처리 완료", alreadyRedeemed: "이미 수령 처리된 코드", expired: "유효 기간이 지난 코드", notFound: "확인할 수 없는 코드" } as const;
    setMessage(copy[result.state]);
  }, onError: () => setMessage("수령 처리에 실패했습니다. 운영자 권한을 확인하세요.") });

  if (loading) return <main className="operator-page"><section className="operator-card"><ShieldCheck/><span>YOUTH ECHO · OPERATOR ONLY</span><h1>운영자 권한을 확인하는 중입니다.</h1><p>행사 코드 관리 도구를 준비하고 있습니다.</p></section></main>;
  if (user?.role !== "admin") return <main className="operator-page"><section className="operator-card"><ShieldCheck/><span>YOUTH ECHO · OPERATOR ONLY</span><h1>운영자 권한이 필요합니다.</h1><p>행사 담당자 계정으로 로그인한 뒤 사용할 수 있습니다. 참가자의 이름·전화번호·위치 기록은 이 화면에서 수집하거나 조회하지 않습니다.</p><button onClick={startLogin}>운영자 로그인</button></section></main>;
  return <main className="operator-page"><header><div><span>YOUTH ECHO · EVENT OPS</span><h1>익명 완주 코드 관리</h1><p>입장권 번호와 완주 화면만 확인합니다. 원문 코드는 한 번 표시되며 서버에는 해시만 저장됩니다.</p></div><ShieldCheck/></header><div className="operator-grid"><section className="operator-card"><KeyRound/><span>01 · 완주 코드 발급</span><h2>현장 확인 후 발급</h2><p>참가자의 종이 입장권 또는 배부 QR의 무작위 번호를 입력합니다. 참가자 개인정보는 입력하지 않습니다.</p><label>입장권 번호<input value={entryToken} onChange={event => setEntryToken(event.target.value)} placeholder="예: YE-ENTRY-4829" /></label><button disabled={entryToken.trim().length < 8 || issue.isPending} onClick={() => issue.mutate({ participationToken: entryToken, validHours: 24 })}>{issue.isPending ? "발급 중" : "완주 코드 발급"}</button>{issued && <div className="issued-code"><small>참가자에게 전달할 코드</small><b>{issued}</b><p>한 번만 표시됩니다. 수령 부스에서 이 코드로 경품을 처리하세요.</p></div>}</section><section className="operator-card"><Gift/><span>02 · 경품 수령 처리</span><h2>코드 1회 사용</h2><p>경품을 전달하기 전에 참가자가 제시한 코드를 입력합니다. 처리 후에는 다시 사용할 수 없습니다.</p><label>완주 코드<input value={prizeCode} onChange={event => setPrizeCode(event.target.value)} placeholder="YE-ABCD-EFGH-IJKL-MNPQ" /></label><button disabled={prizeCode.trim().length < 8 || redeem.isPending} onClick={() => redeem.mutate({ code: prizeCode })}>{redeem.isPending ? "처리 중" : "경품 수령 처리"}</button></section><section className="operator-card operator-guide"><ClipboardCheck/><span>운영 순서</span><ol><li>참가자의 게임 완주 화면을 확인합니다.</li><li>종이 입장권·배부 QR의 무작위 번호를 확인합니다.</li><li>코드를 발급하고, 경품 데스크에서 한 번만 사용 처리합니다.</li></ol><p>{message}</p></section></div></main>;
}

export default function OperatorConsole() { return <OperatorWorkspace/>; }
