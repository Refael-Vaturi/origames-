import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { logAdminAction } from "@/lib/adminLog";
import { TOTAL_LEVELS } from "@/lib/admin";
import { X, User as UserIcon } from "lucide-react";

type PlayerRow = {
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
};

export default function AdminPlayerActions() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerRow[]>([]);
  const [selected, setSelected] = useState<PlayerRow | null>(null);
  const [open, setOpen] = useState(false);
  const isMe = selected?.email && user?.email && selected.email.toLowerCase() === user.email.toLowerCase();

  // Search
  useEffect(() => {
    let active = true;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    if (q.toLowerCase() === "me") {
      // Load current admin profile
      (async () => {
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (active && data) setResults([data as PlayerRow]);
      })();
      return;
    }
    const t = setTimeout(async () => {
      const s = `%${q}%`;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.${s},display_name.ilike.${s},email.ilike.${s}`)
        .limit(10);
      if (active) setResults((data ?? []) as PlayerRow[]);
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, user]);

  const refreshSelected = async () => {
    if (!selected) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", selected.user_id)
      .maybeSingle();
    if (data) setSelected(data as PlayerRow);
  };

  const pick = (p: PlayerRow) => {
    setSelected(p);
    setQuery(p.username ?? p.display_name);
    setOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.playerActions.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("admin.playerActions.subtitle")}
        </p>
      </div>

      {/* Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.playerActions.selectPlayer")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder='Type username or "me"'
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
            {open && results.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-72 overflow-y-auto">
                {results.map((r) => {
                  const me = r.email && user?.email && r.email.toLowerCase() === user.email.toLowerCase();
                  return (
                    <button
                      key={r.id}
                      onClick={() => pick(r)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-muted text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {r.username ?? r.display_name}{" "}
                          {me && (
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected */}
      {selected && (
        <>
          <SelectedCard
            p={selected}
            isMe={!!isMe}
            onClear={() => {
              setSelected(null);
              setQuery("");
            }}
          />
          <ResourcesPanel
            p={selected}
            adminEmail={user!.email!}
            onChanged={refreshSelected}
          />
          <LevelsPanel
            p={selected}
            adminEmail={user!.email!}
            onChanged={refreshSelected}
          />
        </>
      )}
    </div>
  );
}

function SelectedCard({
  p,
  isMe,
  onClear,
}: {
  p: PlayerRow;
  isMe: boolean;
  onClear: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg flex items-center gap-2">
            {p.username ?? p.display_name}
            {isMe && <Badge variant="secondary">You</Badge>}
          </div>
          <div className="text-sm text-muted-foreground truncate">{p.email}</div>
          <div className="flex flex-wrap gap-3 mt-2 text-sm">
            <span>❤️ {p.hearts}</span>
            <span>💰 {p.money}</span>
            <span>🎯 Level {p.current_level}</span>
            <span>🏆 Max {p.admin_max_level}</span>
            <span>🔓 {p.unlocked_levels?.length ?? 0} unlocked</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ResourcesPanel({
  p,
  adminEmail,
  onChanged,
}: {
  p: PlayerRow;
  adminEmail: string;
  onChanged: () => void;
}) {
  const [hearts, setHearts] = useState("");
  const [money, setMoney] = useState("");
  const [setMode, setSetMode] = useState(false);

  const apply = async (field: "hearts" | "money", raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const newVal = setMode ? n : (p[field] ?? 0) + n;
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: Math.max(0, newVal) })
      .eq("user_id", p.user_id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      adminEmail,
      actionType: setMode ? `set_${field}` : `give_${field}`,
      targetUserId: p.user_id,
      targetUsername: p.username,
      amount: n,
    });
    toast.success(`${setMode ? "Set" : "Adjusted"} ${field} (${n}) for ${p.username}`);
    onChanged();
  };

  const quick = async (field: "hearts" | "money", n: number) => {
    setSetMode(false);
    await apply(field, String(n));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Give Resources</CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <Label htmlFor="setmode">Set exact</Label>
          <Switch id="setmode" checked={setMode} onCheckedChange={setSetMode} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Hearts ❤️</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={hearts}
              onChange={(e) => setHearts(e.target.value)}
              placeholder={setMode ? "Set to…" : "Add (negative to subtract)"}
            />
            <Button
              onClick={() => {
                apply("hearts", hearts);
                setHearts("");
              }}
            >
              Apply
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[50, 100, 500, 1000].map((n) => (
              <Button key={n} size="sm" variant="outline" onClick={() => quick("hearts", n)}>
                +{n}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Money 💰</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={money}
              onChange={(e) => setMoney(e.target.value)}
              placeholder={setMode ? "Set to…" : "Add (negative to subtract)"}
            />
            <Button
              onClick={() => {
                apply("money", money);
                setMoney("");
              }}
            >
              Apply
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[50, 100, 500, 1000].map((n) => (
              <Button key={n} size="sm" variant="outline" onClick={() => quick("money", n)}>
                +{n}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LevelsPanel({
  p,
  adminEmail,
  onChanged,
}: {
  p: PlayerRow;
  adminEmail: string;
  onChanged: () => void;
}) {
  const [level, setLevel] = useState("1");
  const [currentLv, setCurrentLv] = useState(String(p.current_level));
  useEffect(() => setCurrentLv(String(p.current_level)), [p.current_level]);

  const lvNum = Math.max(1, Math.min(TOTAL_LEVELS, parseInt(level, 10) || 1));

  const update = async (
    actionType: string,
    patch: Partial<PlayerRow>,
    levelNumber?: number
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("user_id", p.user_id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      adminEmail,
      actionType,
      targetUserId: p.user_id,
      targetUsername: p.username,
      levelNumber,
    });
    toast.success("Updated");
    onChanged();
  };

  const unlocked = new Set(p.unlocked_levels ?? []);

  const unlockOne = () => {
    unlocked.add(lvNum);
    update(
      "unlock_level",
      {
        unlocked_levels: Array.from(unlocked).sort((a, b) => a - b),
        admin_max_level: Math.max(p.admin_max_level, lvNum),
      },
      lvNum
    );
  };

  const unlockUpTo = () => {
    const arr = Array.from({ length: lvNum }, (_, i) => i + 1);
    update(
      "unlock_up_to",
      { unlocked_levels: arr, admin_max_level: Math.max(p.admin_max_level, lvNum) },
      lvNum
    );
  };

  const unlockAll = () => {
    const arr = Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1);
    update(
      "unlock_all",
      { unlocked_levels: arr, admin_max_level: TOTAL_LEVELS },
      TOTAL_LEVELS
    );
  };

  const lockOne = () => {
    unlocked.delete(lvNum);
    update(
      "lock_level",
      { unlocked_levels: Array.from(unlocked).sort((a, b) => a - b) },
      lvNum
    );
  };

  const reset = () => {
    update("reset_progress", {
      unlocked_levels: [1],
      current_level: 1,
      admin_max_level: 1,
    });
  };

  const setCurrent = () => {
    const n = Math.max(1, Math.min(TOTAL_LEVELS, parseInt(currentLv, 10) || 1));
    update("set_current_level", { current_level: n }, n);
  };

  // Visualize first 100 levels
  const previewMax = Math.min(100, p.admin_max_level + 10, TOTAL_LEVELS);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Levels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Target Level (1 - {TOTAL_LEVELS})</Label>
          <Input
            type="number"
            min={1}
            max={TOTAL_LEVELS}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={unlockOne}>
              Unlock This Level
            </Button>
            <Button size="sm" variant="outline" onClick={unlockUpTo}>
              Unlock Up To This
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Unlock ALL Levels
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unlock all {TOTAL_LEVELS} levels?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This grants the player access to every level in the game.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={unlockAll}>Unlock all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="outline" onClick={lockOne}>
              Lock This Level
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  Reset Progress
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The player will go back to Level 1 with only Level 1 unlocked.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={reset}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Set Current Level (teleport)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={currentLv}
              onChange={(e) => setCurrentLv(e.target.value)}
            />
            <Button onClick={setCurrent}>Set</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Unlocked overview (showing 1–{previewMax} of {TOTAL_LEVELS})
          </Label>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: previewMax }, (_, i) => i + 1).map((lv) => (
              <div
                key={lv}
                className={`text-[10px] text-center py-1 rounded ${
                  unlocked.has(lv)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {lv}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
