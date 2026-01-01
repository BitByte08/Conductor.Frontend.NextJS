"use client";
import { useEffect, useRef, useState } from "react";

type Message = {
    type: string;
    payload?: unknown;
    raw?: string;
};

export const useAgentSocket = (agentId: string) => {
    const ws = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<string>("DISCONNECTED");
    const [agentStatus, setAgentStatus] = useState<string>("OFFLINE");
    const [messages, setMessages] = useState<Message[]>([]);
    const [serverStatus, setServerStatus] = useState<string>("UNKNOWN");
    const [metadata, setMetadata] = useState<string>("");
    const [cpuUsage, setCpuUsage] = useState<number>(0);
    const [ramUsage, setRamUsage] = useState<number>(0);
    const [ramTotal, setRamTotal] = useState<number>(0);
    const [configRam, setConfigRam] = useState<string>("");
    const [properties, setProperties] = useState<Record<string, string>>({});
    const [mods, setMods] = useState<string[]>([]);

    useEffect(() => {
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE as string) || "https://conductor.bitworkspace.kr";
        const wsBase = apiBase.replace(/^http/, "ws").replace(/\/$/, "");
        const wsUrl = `${wsBase}/ws/client/${agentId}`;

        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => setStatus("CONNECTED");
        socket.onclose = () => {
            setStatus("DISCONNECTED");
            setAgentStatus("OFFLINE");
        };
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "AGENT_STATUS") {
                    setAgentStatus(data.status);
                } else if (data.type === "HEARTBEAT") {
                    setServerStatus(data.server_status || "UNKNOWN");
                    setMetadata(data.metadata || "");
                    if (typeof data.cpu_usage === "number") setCpuUsage(data.cpu_usage);
                    if (typeof data.ram_usage === "number") setRamUsage(data.ram_usage);
                    if (typeof data.ram_total === "number") setRamTotal(data.ram_total);
                    if (data.config?.ram_mb) setConfigRam(data.config.ram_mb);
                } else if (data.type === "PROPERTIES") {
                    setProperties(data.payload || {});
                } else if (data.type === "MODS") {
                    const files = data.payload?.files || [];
                    setMods(Array.isArray(files) ? files : []);
                } else {
                    setMessages((prev) => [...prev.slice(-99), data]);
                }
            } catch {
                setMessages((prev) => [...prev.slice(-99), { type: "RAW", raw: event.data }]);
            }
        };

        return () => {
            socket.close();
        };
    }, [agentId]);

    return { agentStatus, wsStatus: status, messages, serverStatus, metadata, cpuUsage, ramUsage, ramTotal, configRam, properties, mods };
};
