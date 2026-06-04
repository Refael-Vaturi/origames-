import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

export default function AdminLogs() {
  const { t } = useLanguage();
  const [adminFilter, setAdminFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", adminFilter, actionFilter, from, to],
    queryFn: async () => {
      let q = supabase
        .from("admin_actions_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (adminFilter.trim()) q = q.ilike("admin_email", `%${adminFilter.trim()}%`);
      if (actionFilter !== "all") q = q.eq("action_type", actionFilter);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) q = q.lte("created_at", new Date(to).toISOString());
      const { data } = await q;
      return data ?? [];
    },
  });

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((d: { action_type: string }) => set.add(d.action_type));
    return Array.from(set);
  }, [data]);

  const exportCsv = () => {
    if (!data?.length) return;
    const headers = [
      "created_at",
      "admin_email",
      "action_type",
      "target_username",
      "amount",
      "level_number",
    ];
    const lines = [headers.join(",")];
    for (const r of data) {
      lines.push(
        headers
          .map((h) => JSON.stringify((r as never as Record<string, unknown>)[h] ?? ""))
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.logs.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.logs.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> {t("admin.users.exportCsv")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input
              placeholder={t("admin.logs.filterAdmin")}
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.logs.filterAction")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.logs.allActions")}</SelectItem>
                {actionTypes.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.logs.when")}</TableHead>
                <TableHead>{t("admin.logs.admin")}</TableHead>
                <TableHead>{t("admin.logs.action")}</TableHead>
                <TableHead>{t("admin.logs.target")}</TableHead>
                <TableHead>{t("admin.logs.amount")}</TableHead>
                <TableHead>{t("admin.logs.level")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("admin.common.loading")}
                  </TableCell>
                </TableRow>
              )}
                {data?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{r.admin_email}</TableCell>
                    <TableCell>{r.action_type}</TableCell>
                    <TableCell>{r.target_username ?? "—"}</TableCell>
                    <TableCell>{r.amount ?? "—"}</TableCell>
                    <TableCell>{r.level_number ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
