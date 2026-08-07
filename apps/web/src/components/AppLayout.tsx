import { Link, Outlet } from "@tanstack/react-router";
import { Dices, LogOut, ScrollText, Users } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAuthGuard } from "../router";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/app/campaigns", label: "Kampanie", icon: Users },
  { to: "/app/characters", label: "Postacie", icon: ScrollText },
] as const;

export default function AppLayout() {
  const guard = useAuthGuard();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      {guard}
      <aside className="flex w-56 flex-col border-r border-[#5a3d1c] bg-[#241708] px-3 py-4 text-[#e8d3a0] shadow-[inset_-10px_0_18px_-14px_rgba(0,0,0,0.7)]">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Dices className="size-5 text-[#e5cfa0]" />
          <span className="font-display text-lg tracking-[0.14em] text-[#e5cfa0]">DoMino</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 rounded-sm border border-transparent px-2 py-1.5 font-display text-xs uppercase tracking-[0.1em] text-[#c9b183] transition-colors hover:border-[#5a3d1c] hover:bg-[#33220e] hover:text-[#f4e4bd]",
                "data-[status=active]:border-[#a97e1f]/60 data-[status=active]:bg-[#33220e] data-[status=active]:text-[#f0d78f]",
              )}
              activeOptions={{ exact: true }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 px-2">
          <span className="text-sm italic text-[#c9b183]">{user?.username}</span>
          <Button variant="ghost" size="sm" onClick={() => void logout()} className="text-[#c9b183] hover:bg-[#33220e] hover:text-[#f4e4bd]">
            <LogOut className="size-4" />
            Wyloguj się
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
