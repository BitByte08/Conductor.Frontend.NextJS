"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../../lib/axios";
import { useAgentSocket } from "../../../../hooks/useAgentSocket";

export default function ServerSettingsPage() {
    const { agentId } = useParams<{ agentId: string }>();
    const router = useRouter();
    const { configRam, properties } = useAgentSocket(agentId);
    const [ramInput, setRamInput] = useState<string>("");
    const [savingRam, setSavingRam] = useState(false);
    const [propertiesState, setPropertiesState] = useState<Record<string, string>>({});
    const [propsLoading, setPropsLoading] = useState(false);
    const [propsSaving, setPropsSaving] = useState(false);
    const [msg, setMsg] = useState<string>("");
    const [collabs, setCollabs] = useState<Array<{ id: number; username: string; role: string }>>([]);
    const [collabName, setCollabName] = useState("");
    const [collabRole, setCollabRole] = useState("viewer");
    const [collabLoading, setCollabLoading] = useState(false);

    useEffect(() => {
        if (configRam) setRamInput(configRam);
    }, [configRam]);

    useEffect(() => {
        setPropertiesState(properties || {});
    }, [properties]);

    const propertyKeys = useMemo(() => Object.keys(propertiesState || {}).sort(), [propertiesState]);

    const refreshProperties = useCallback(async () => {
        setPropsLoading(true);
        try {
            await api.post(`/api/agent/${agentId}/properties/fetch`);
            setMsg("server.properties 읽기를 요청했습니다 (에이전트 연결 필요)");
        } finally {
            setPropsLoading(false);
        }
    }, [agentId]);

    const saveRam = async () => {
        if (!ramInput.trim()) return;
        setSavingRam(true);
        try {
            await api.post(`/api/agent/${agentId}/config`, { ram_mb: ramInput.trim() });
            setMsg("RAM 설정을 적용했습니다.");
        } finally {
            setSavingRam(false);
        }
    };

    const saveProperties = async () => {
        setPropsSaving(true);
        try {
            await api.post(`/api/agent/${agentId}/properties/update`, propertiesState);
            setMsg("server.properties를 저장했습니다.");
        } finally {
            setPropsSaving(false);
        }
    };

    const updateProperty = (key: string, value: string) => {
        setPropertiesState((prev) => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        refreshProperties();
    }, [refreshProperties]);

    const fetchCollaborators = useCallback(async () => {
        try {
            const { data } = await api.get(`/api/agent/${agentId}/collaborators`);
            setCollabs(data || []);
        } catch {
            // ignore
        }
    }, [agentId]);

    const addCollaborator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collabName.trim()) return;
        setCollabLoading(true);
        try {
            await api.post(`/api/agent/${agentId}/collaborators`, { username: collabName.trim(), role: collabRole });
            setMsg("협업자를 추가했습니다.");
            setCollabName("");
            await fetchCollaborators();
        } finally {
            setCollabLoading(false);
        }
    };

    const removeCollaborator = async (userId: number) => {
        if (!confirm("이 협업자를 제거할까요?")) return;
        setCollabLoading(true);
        try {
            await api.delete(`/api/agent/${agentId}/collaborators/${userId}`);
            setMsg("협업자를 제거했습니다.");
            await fetchCollaborators();
        } finally {
            setCollabLoading(false);
        }
    };

    const deleteServer = async () => {
        if (!confirm("서버를 삭제하면 되돌릴 수 없습니다. 계속할까요?")) return;
        try {
            await api.delete(`/api/agent/${agentId}`);
            router.push("/dashboard");
        } catch {
            setMsg("삭제 실패: 권한 또는 연결을 확인하세요.");
        }
    };

    useEffect(() => {
        fetchCollaborators();
    }, [fetchCollaborators]);

    return (
        <div className="text-white">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">설정: {agentId}</h1>
                    <button onClick={() => window.history.back()} className="text-sm text-slate-400 hover:text-white">뒤로가기</button>
                </div>
                <div className="flex gap-3 text-sm text-blue-300">
                    <Link href={`/server/${agentId}`}>요약</Link>
                    <Link href={`/server/${agentId}/console`}>콘솔</Link>
                    <Link href={`/server/${agentId}/mods`}>모드/플러그인</Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-slate-400 text-sm">RAM 설정</div>
                            <div className="text-lg font-semibold">{configRam || "-"}</div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm"
                                value={ramInput}
                                onChange={(e) => setRamInput(e.target.value)}
                                placeholder="예: 4G or 4096M"
                            />
                            <button onClick={saveRam} disabled={savingRam} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-sm disabled:opacity-60">적용</button>
                        </div>
                    </div>
                    <div className="text-sm text-slate-400">/api/agent/{agentId}/config 로 ram_mb 값을 보냅니다.</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-slate-400 text-sm">협업자</div>
                            <div className="text-lg font-semibold">{collabs.length}명</div>
                        </div>
                        <button onClick={fetchCollaborators} className="text-xs bg-slate-800 px-3 py-1 rounded">새로고침</button>
                    </div>
                    <form onSubmit={addCollaborator} className="grid grid-cols-3 gap-2">
                        <input className="col-span-2 px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm" placeholder="username" value={collabName} onChange={(e) => setCollabName(e.target.value)} />
                        <select className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm" value={collabRole} onChange={(e) => setCollabRole(e.target.value)}>
                            <option value="viewer">viewer</option>
                            <option value="manager">manager</option>
                        </select>
                        <button type="submit" disabled={collabLoading} className="col-span-3 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded text-sm disabled:opacity-60">추가</button>
                    </form>
                    <div className="space-y-2 text-sm">
                        {collabs.length === 0 ? (
                            <div className="text-slate-500">협업자가 없습니다.</div>
                        ) : (
                            collabs.map((c) => (
                                <div key={c.id} className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded border border-slate-700">
                                    <div>
                                        <div className="font-medium">{c.username || c.id}</div>
                                        <div className="text-xs text-slate-400">{c.role}</div>
                                    </div>
                                    <button onClick={() => removeCollaborator(c.id)} disabled={collabLoading} className="text-xs bg-red-600 hover:bg-red-500 px-3 py-1 rounded disabled:opacity-60">제거</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded p-4 mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <div className="text-slate-400 text-sm">server.properties</div>
                        <div className="text-lg font-semibold">{propertyKeys.length} 항목</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={refreshProperties} disabled={propsLoading} className="bg-slate-800 px-3 py-2 rounded text-sm disabled:opacity-60">새로고침</button>
                        <button onClick={saveProperties} disabled={propsSaving} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded text-sm disabled:opacity-60">저장</button>
                    </div>
                </div>
                {propertyKeys.length === 0 ? (
                    <div className="text-sm text-slate-500">프로퍼티가 없습니다. 에이전트가 연결된 상태에서 새로고침을 누르세요.</div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {propertyKeys.map((k) => (
                            <div key={k} className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400">{k}</label>
                                <input
                                    className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm"
                                    value={propertiesState[k] ?? ""}
                                    onChange={(e) => updateProperty(k, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                )}
                <div className="text-xs text-slate-500 mt-3">읽기 요청은 WebSocket으로 PROPERTIES 응답을 받습니다.</div>
            </div>

            <div className="bg-red-900/40 border border-red-800 rounded p-4 mt-4 flex items-center justify-between">
                <div>
                    <div className="text-red-200 font-semibold">서버 삭제</div>
                    <div className="text-xs text-red-100/80">서버와 협업 설정이 삭제됩니다. 에이전트 파일 정리는 별도 수행이 필요할 수 있습니다.</div>
                </div>
                <button onClick={deleteServer} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm">삭제</button>
            </div>

            {msg && <div className="mt-3 text-sm text-emerald-400">{msg}</div>}
        </div>
    );
}
