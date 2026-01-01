"use client";
import { useState } from "react";
import api from "../../lib/axios";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const { setToken } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await api.post("/auth/register", { username, password });
            setToken(data.access_token);
            router.push("/dashboard");
        } catch {
            alert("회원가입 실패");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
            <form onSubmit={handleRegister} className="bg-slate-900 p-8 rounded-lg w-full max-w-sm flex flex-col gap-4">
                <h1 className="text-xl font-semibold">회원가입</h1>
                <input className="px-3 py-2 rounded bg-slate-800" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input className="px-3 py-2 rounded bg-slate-800" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="bg-blue-600 hover:bg-blue-500 py-2 rounded font-medium" type="submit">가입</button>
                <Link className="text-sm text-blue-300" href="/login">로그인</Link>
            </form>
        </div>
    );
}
