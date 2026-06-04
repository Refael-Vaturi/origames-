import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Radio,
  Crosshair,
  Download,
  ScrollText,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin", label: "admin.dashboard.title", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "admin.users.title", icon: Users },
  { to: "/admin/live", label: "admin.live.title", icon: Radio },
  { to: "/admin/player-actions", label: "admin.playerActions.title", icon: Crosshair },
  { to: "/admin/download", label: "admin.download.title", icon: Download },
  { to: "/admin/logs", label: "admin.logs.title", icon: ScrollText },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card">
        <div className="px-4 py-5 border-b border-border">
          <div className="text-lg font-bold">🛡️ {t("admin.layout.adminPanel")}</div>
          <div className="text-xs text-muted-foreground">{t("admin.layout.ironDome")}</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Game
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold">🛡️ Admin</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="md:hidden border-b border-border bg-card overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground bg-muted/40"
                  )
                }
              >
                <l.icon className="h-3.5 w-3.5" />
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
