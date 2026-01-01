"use client";
import { Send, Play, Square } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAgentSocket } from "../../../../hooks/useAgentSocket";
import api from "../../../../lib/axios";

export default function ConsolePage() {
    const { agentId } = useParams<{ agentId: string }>();
    const { messages, wsStatus, agentStatus } = useAgentSocket(agentId);
    const [input, setInput] = useState("");

    const sendCommand = async (cmd: string) => {
        await api.post(`/api/agent/${agentId}/command`, { command: cmd });
    };

    const handleAction = async (action: "start" | "stop") => {
        await api.post(`/api/agent/${agentId}/${action}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        await sendCommand(input.trim());
        setInput("");
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
                <h1 className="text-xl font-semibold">콘솔 ({agentId})</h1>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${wsStatus === "CONNECTED" ? "bg-green-400" : "bg-red-500"}`} />
                    {wsStatus} / {agentStatus}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleAction("start")} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded flex items-center gap-1 text-sm"><Play size={16}/>Start</button>
                    <button onClick={() => handleAction("stop")} className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded flex items-center gap-1 text-sm"><Square size={16}/>Stop</button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded p-3 font-mono text-sm whitespace-pre-wrap max-h-[70vh] min-h-[360px] overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="text-slate-500">Waiting for logs...</div>
                ) : (
                    messages.map((m, idx) => {
                        if (m.type === "LOG") {
                            const line = typeof m.payload === "object" && m.payload !== null && "line" in m.payload ? (m.payload as { line?: string }).line : "";
                            return <div key={idx}>{line}</div>;
                        }
                        if (m.type === "RAW") return <div key={idx} className="text-slate-400">{m.raw}</div>;
                        return <div key={idx} className="text-indigo-300">{JSON.stringify(m)}</div>;
                    })
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" placeholder="명령어 입력" value={input} onChange={(e) => setInput(e.target.value)} />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 rounded flex items-center gap-1"><Send size={16}/>Send</button>
            </form>
        </div>
    );
}
