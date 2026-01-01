import { LayoutShell } from "../../components/Layout";

export default function ServerLayout({ children }: { children: React.ReactNode }) {
    return <LayoutShell>{children}</LayoutShell>;
}
