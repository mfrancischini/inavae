import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function BackToDashboardLink() {
  return (
    <Link className="back-to-dashboard" href="/dashboard">
      <LayoutDashboard size={15} strokeWidth={2} aria-hidden="true" />
      <span>Volver al Dashboard</span>
    </Link>
  );
}
