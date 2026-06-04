import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, ScrollText, Radio, TrendingUp } from "lucide-react";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AdminDashboard() {
  const { onlineUsers } = useOnlinePresence({ track: false });

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [usersCount, logsCount, last24h] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("admin_actions_log").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);
      return {
        users: usersCount.count ?? 0,
        actions: logsCount.count ?? 0,
        new24h: last24h.count ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["admin-recent-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_actions_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.users ?? "—", icon: Users },
    { label: "Online Now", value: onlineUsers.length, icon: Radio },
    { label: "New (24h)", value: stats?.new24h ?? "—", icon: TrendingUp },
    { label: "Admin Actions", value: stats?.actions ?? "—", icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your game</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {!recent?.length && (
            <p className="text-sm text-muted-foreground">No actions yet.</p>
          )}
          <div className="space-y-2">
            {recent?.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2"
              >
                <div>
                  <span className="font-medium">{a.admin_email}</span>
                  <span className="text-muted-foreground"> · {a.action_type}</span>
                  {a.target_username && (
                    <span className="text-muted-foreground"> → {a.target_username}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
