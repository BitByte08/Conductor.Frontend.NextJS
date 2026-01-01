"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/axios";
import { useAgentSocket } from "../../../../hooks/useAgentSocket";

const steps = [1, 2, 3];

export default function InstallerPage() {
    const { agentId } = useParams<{ agentId: string }>();
    const router = useRouter();
    const { agentStatus, messages } = useAgentSocket(agentId);

    const agentOnline = agentStatus === "ONLINE";

    const [step, setStep] = useState<number>(1);
    const [type, setType] = useState<string>("vanilla");
    const [versions, setVersions] = useState<Array<{ id: string }>>([]);
    const [filter, setFilter] = useState("");
    const [selectedVersion, setSelectedVersion] = useState("");
    const [installing, setInstalling] = useState(false);
    const [installMessage, setInstallMessage] = useState<string | null>(null);
    const [installError, setInstallError] = useState<string | null>(null);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [versionsError, setVersionsError] = useState<string | null>(null);

    useEffect(() => {
        if (step !== 2) return;
        const controller = new AbortController();
        setLoadingVersions(true);
        setVersionsError(null);
        const timer = window.setTimeout(async () => {
            try {
                const q = filter ? `?q=${encodeURIComponent(filter)}&limit=200` : "?limit=200";
                const { data } = await api.get<string[]>(`/api/metadata/versions/${type}${q}`, { signal: controller.signal });
                setVersions((data || []).map((v) => ({ id: v })));
                setVersionsError(null);
            } catch (err) {
                const msg = err instanceof Error ? err.message : "버전 목록을 불러오지 못했습니다";
                setVersionsError(msg);
                setVersions([]);
            } finally {
                setLoadingVersions(false);
            }
        }, 250);
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [step, type, filter]);

    useEffect(() => {
        if (!installing) return;
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i] as { type?: string; payload?: { line?: string }; raw?: string } | undefined;
            if (!msg) continue;
            if (msg.type === "LOG") {
                const line = msg.payload?.line || "";
                if (line.includes("Installation complete")) {
                    setInstallMessage("설치 완료! 서버 시작 후 콘솔로 이동합니다.");
                    api.post(`/api/agent/${agentId}/start`).catch(() => {});
                    setInstalling(false);
                    setTimeout(() => router.push(`/server/${agentId}/console`), 800);
                    return;
                }
                if (line.toLowerCase().includes("failed")) {
                    setInstallError(line);
                    setInstallMessage(null);
                    setInstalling(false);
                    return;
                }
                setInstallMessage(line);
                break;
            } else if (msg.type === "RAW") {
                setInstallMessage(msg.raw || null);
                break;
            }
        }
    }, [messages, installing, agentId, router]);

    const handleInstall = async () => {
        if (!selectedVersion) return;
        if (!agentOnline) {
            setInstallError("에이전트 연결 후 설치할 수 있습니다.");
            return;
        }
        setInstalling(true);
        setInstallError(null);
        setInstallMessage("설치 요청을 전송했습니다. 에이전트 진행 로그를 기다리는 중...");
        try {
            await api.post(`/api/agent/${agentId}/install`, { type, version: selectedVersion });
        } catch (e) {
            const errMsg = typeof e === "object" && e && "response" in e
                ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
                : undefined;
            setInstallError(errMsg || (e instanceof Error ? e.message : "설치 요청 실패"));
            setInstallMessage(null);
            setInstalling(false);
        }
    };

    const stepLabel = useMemo(() => {
        if (step === 1) return "서버 종류 선택";
        if (step === 2) return "버전 선택";
        return "설치 확인";
    }, [step]);

    return (
        <div className="text-white space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-slate-400">Installer</div>
                    <h1 className="text-2xl font-semibold">서버 설치: {agentId}</h1>
                </div>
                <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-white">뒤로가기</button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded p-4">
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <span className="text-slate-400">에이전트 상태:</span>
                    <span className={agentOnline ? "text-emerald-400" : "text-amber-400"}>{agentStatus}</span>
                    {!agentOnline && <span className="text-xs text-amber-400">(설치/제어 불가)</span>}
                </div>

                <div className="flex gap-2 mb-6">
                    {steps.map((s) => (
                        <div key={s} className={`h-1 flex-1 rounded ${s <= step ? "bg-blue-500" : "bg-slate-700"}`} />
                    ))}
                </div>

                <div className="text-lg font-semibold mb-3">{stepLabel}</div>

                {step === 1 && (
                    <div className="grid md:grid-cols-3 gap-3">
                        {["vanilla", "paper", "fabric"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`border rounded p-4 text-left bg-slate-800/60 hover:border-blue-400 ${type === t ? "border-blue-400" : "border-slate-700"}`}
                            >
                                <div className="text-sm text-slate-300 uppercase">{t}</div>
                                <div className="text-xs text-slate-500 mt-1">{t === "paper" ? "플러그인 지원" : t === "fabric" ? "모드 로더" : "순정"}</div>
                            </button>
                        ))}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-3">
                        <input
                            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm"
                            placeholder="버전 검색..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                        <div className="max-h-64 overflow-y-auto border border-slate-800 rounded">
                            <ul className="divide-y divide-slate-800">
                                {versions.map((v) => (
                                    <li key={v.id}>
                                        <button
                                            onClick={() => setSelectedVersion(v.id)}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800 ${selectedVersion === v.id ? "bg-slate-800" : ""}`}
                                        >
                                            {v.id}
                                        </button>
                                    </li>
                                ))}
                                {versions.length === 0 && !loadingVersions && !versionsError && (
                                    <li className="px-3 py-2 text-sm text-slate-500">버전 목록이 없습니다. 유형을 변경하거나 검색어를 지워보세요.</li>
                                )}
                                {versionsError && (
                                    <li className="px-3 py-2 text-sm text-red-400">{versionsError}</li>
                                )}
                                {loadingVersions && (
                                    <li className="px-3 py-2 text-sm text-slate-400">불러오는 중...</li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-3">
                        <div className="text-sm text-slate-300">종류: {type} / 버전: {selectedVersion || "-"}</div>
                        <div className="text-xs text-amber-300 bg-amber-900/40 border border-amber-700 rounded p-2">주의: 기존 server.jar가 덮어씌워집니다.</div>
                        {installError && <div className="text-sm text-red-400">{installError}</div>}
                        {installMessage && <div className="text-xs text-blue-200 bg-slate-800/60 border border-slate-700 rounded p-2 whitespace-pre-wrap">{installMessage}</div>}
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mt-6">
                    <button
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        disabled={step === 1 || installing}
                        className="px-4 py-2 rounded bg-slate-800 text-sm disabled:opacity-50"
                    >
                        이전
                    </button>
                    {step < 3 && (
                        <button
                            onClick={() => setStep((s) => Math.min(3, s + 1))}
                            disabled={(step === 1 && !agentOnline) || (step === 2 && !selectedVersion) || installing}
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm disabled:opacity-50"
                        >
                            다음
                        </button>
                    )}
                    {step === 3 && (
                        <button
                            onClick={handleInstall}
                            disabled={!agentOnline || installing || !selectedVersion}
                            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm disabled:opacity-50"
                        >
                            {installing ? "설치 중..." : "설치 시작"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
