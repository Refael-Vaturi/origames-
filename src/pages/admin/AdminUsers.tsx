import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { logAdminAction } from "@/lib/adminLog";
import { Heart, Coins, Download } from "lucide-react";

type AdminProfile = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  hearts: number;
  money: number;
  current_level: number;
  admin_max_level: number;
  unlocked_levels: number[];
  created_at: string;
  last_seen: string | null;
};

const PAGE_SIZE = 50;

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: keyof AdminProfile; asc: boolean }>({
    key: "created_at",
    asc: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-profiles", search, page, sort],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select(
          "id,user_id,username,display_name,email,avatar_url,hearts,money,current_level,admin_max_level,unlocked_levels,created_at,last_seen",
          { count: "exact" }
        )
        .order(sort.key as string, { ascending: sort.asc })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`username.ilike.${s},display_name.ilike.${s},email.ilike.${s}`);
      }
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as AdminProfile[], count: count ?? 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-profiles"] });

  const giveResource = async (
    p: AdminProfile,
    field: "hearts" | "money",
    amount: number
  ) => {
    if (!amount) return;
    const newVal = (p[field] ?? 0) + amount;
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: newVal })
      .eq("user_id", p.user_id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      adminEmail: user!.email!,
      actionType: `give_${field}`,
      targetUserId: p.user_id,
      targetUsername: p.username,
      amount,
    });
    toast.success(`+${amount} ${field} → ${p.username ?? p.display_name}`);
    refresh();
  };

  const bulkGive = async (field: "hearts" | "money", amount: number) => {
    if (!amount) return;
    const { data: all } = await supabase.from("profiles").select(`user_id,${field}`);
    if (!all) return;
    let ok = 0;
    for (const row of all as unknown as Array<{ user_id: string } & Record<string, number>>) {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: (row[field] ?? 0) + amount })
        .eq("user_id", row.user_id);
      if (!error) ok++;
    }
    await logAdminAction({
      adminEmail: user!.email!,
      actionType: `bulk_give_${field}`,
      amount,
      details: { affected: ok },
    });
    toast.success(`Gave ${amount} ${field} to ${ok} users`);
    refresh();
  };

  const exportCsv = () => {
    if (!data?.rows.length) return;
    const headers = [
      "username",
      "display_name",
      "email",
      "hearts",
      "money",
      "current_level",
      "admin_max_level",
      "created_at",
    ];
    const lines = [headers.join(",")];
    for (const r of data.rows) {
      lines.push(
        headers.map((h) => JSON.stringify((r as never as Record<string, unknown>)[h] ?? "")).join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortableHeader = (label: string, key: keyof AdminProfile) => (
    <button
      className="font-medium hover:text-foreground"
      onClick={() =>
        setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))
      }
    >
      {label}
      {sort.key === key && <span className="ml-1">{sort.asc ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.users.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {data?.count ?? 0} {t("admin.users.totalPlayers")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> {t("admin.users.exportCsv")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.users.bulkActions")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <BulkAction label={t("admin.users.giveHeartsAll")} field="hearts" onConfirm={bulkGive} />
          <BulkAction label={t("admin.users.giveMoneyAll")} field="money" onConfirm={bulkGive} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <Input
            placeholder={t("admin.users.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{sortableHeader(t("admin.users.username"), "username")}</TableHead>
                  <TableHead>{t("admin.users.name")}</TableHead>
                  <TableHead>{t("admin.users.email")}</TableHead>
                  <TableHead>{sortableHeader(t("admin.users.hearts"), "hearts")}</TableHead>
                  <TableHead>{sortableHeader(t("admin.users.money"), "money")}</TableHead>
                  <TableHead>{sortableHeader(t("admin.users.level"), "current_level")}</TableHead>
                  <TableHead>{sortableHeader(t("admin.users.max"), "admin_max_level")}</TableHead>
                  <TableHead>{sortableHeader(t("admin.users.created"), "created_at")}</TableHead>
                  <TableHead>{t("admin.users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      {t("admin.users.loading")}
                    </TableCell>
                  </TableRow>
                )}
                {data?.rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.username ?? "—"}</TableCell>
                    <TableCell>{p.display_name}</TableCell>
                    <TableCell className="text-xs">{p.email ?? "—"}</TableCell>
                    <TableCell>{p.hearts}</TableCell>
                    <TableCell>{p.money}</TableCell>
                    <TableCell>{p.current_level}</TableCell>
                    <TableCell>{p.admin_max_level}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <RowActions p={p} onGive={giveResource} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("admin.users.page")} {page + 1} {t("admin.users.of")} {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("admin.users.previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("admin.users.next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BulkAction({
  label,
  field,
  onConfirm,
}: {
  label: string;
  field: "hearts" | "money";
  onConfirm: (field: "hearts" | "money", amount: number) => void;
}) {
  const { t, tf } = useLanguage();
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        placeholder={label}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-44"
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" disabled={!val}>
            {t("admin.common.apply")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.confirmBulkTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tf("admin.users.confirmBulkDesc", { val, field })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onConfirm(field, parseInt(val, 10));
                setVal("");
              }}
            >
              {t("admin.common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  p,
  onGive,
}: {
  p: AdminProfile;
  onGive: (p: AdminProfile, field: "hearts" | "money", amount: number) => void;
}) {
  const { t } = useLanguage();
  const [hearts, setHearts] = useState("");
  const [money, setMoney] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("admin.users.manage")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{p.username ?? p.display_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm space-y-1">
            <div>Email: {p.email}</div>
            <div className="flex gap-3">
              <span>
                <Heart className="inline h-3 w-3" /> {p.hearts}
              </span>
              <span>
                <Coins className="inline h-3 w-3" /> {p.money}
              </span>
              <span>Lvl {p.current_level}</span>
              <span>Max {p.admin_max_level}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
              {(p.unlocked_levels ?? []).slice(0, 50).map((lv) => (
                <Badge key={lv} variant="secondary" className="text-[10px]">
                  {lv}
                </Badge>
              ))}
              {(p.unlocked_levels?.length ?? 0) > 50 && (
                <Badge variant="outline">+{p.unlocked_levels.length - 50}</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Hearts"
                value={hearts}
                onChange={(e) => setHearts(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => {
                  onGive(p, "hearts", parseInt(hearts, 10) || 0);
                  setHearts("");
                }}
              >
                Give
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[100, 500, 1000].map((n) => (
                <Button key={n} size="sm" variant="outline" onClick={() => onGive(p, "hearts", n)}>
                  +{n} ❤️
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Money"
                value={money}
                onChange={(e) => setMoney(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => {
                  onGive(p, "money", parseInt(money, 10) || 0);
                  setMoney("");
                }}
              >
                Give
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[1000, 5000, 10000].map((n) => (
                <Button key={n} size="sm" variant="outline" onClick={() => onGive(p, "money", n)}>
                  +{n} 💰
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
