import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Film, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminAction } from "@/lib/adminLog";

interface Recording {
  id: string;
  user_id: string | null;
  username: string | null;
  game: string;
  score: number;
  duration_ms: number;
  summary: Record<string, unknown>;
  events: unknown[];
  created_at: string;
}

export default function AdminGameRecordings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-recordings", gameFilter, search],
    queryFn: async () => {
      let q = (supabase.from as any)("game_recordings")
        .select("id,user_id,username,game,score,duration_ms,summary,events,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (gameFilter !== "all") q = q.eq("game", gameFilter);
      if (search.trim()) q = q.ilike("username", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Recording[];
    },
  });

  const remove = async (r: Recording) => {
    if (!confirm("Delete this recording?")) return;
    const { error } = await (supabase.from as any)("game_recordings").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      adminEmail: user!.email!,
      actionType: "delete_recording",
      targetUserId: r.user_id ?? undefined,
      details: { game: r.game, score: r.score },
    });
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-recordings"] });
  };

  const games = ["all", "iron-dome", "fake-it-fast", "city-find", "clicker", "color-identify"];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Film className="w-6 h-6" /> Game Recordings
        </h1>
        <p className="text-sm text-muted-foreground">
          All recorded game sessions from every game.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {games.map((g) => (
              <Button
                key={g}
                size="sm"
                variant={gameFilter === g ? "default" : "outline"}
                onClick={() => setGameFilter(g)}
              >
                {g}
              </Button>
            ))}
            <div className="relative ml-auto">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username"
                className="pl-8 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!isLoading && !data?.length && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No recordings yet.</TableCell></TableRow>
                )}
                {data?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{r.game}</Badge></TableCell>
                    <TableCell>{r.username ?? <span className="text-muted-foreground">guest</span>}</TableCell>
                    <TableCell className="font-mono">{r.score}</TableCell>
                    <TableCell className="text-xs">{(r.duration_ms / 1000).toFixed(1)}s</TableCell>
                    <TableCell className="text-xs">{(r.events as unknown[])?.length ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">View</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{r.game} — {r.username ?? "guest"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                              <div>
                                <div className="font-semibold">Summary</div>
                                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                  {JSON.stringify(r.summary, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <div className="font-semibold">Events ({(r.events as unknown[])?.length ?? 0})</div>
                                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-80">
                                  {JSON.stringify(r.events, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button size="icon" variant="ghost" onClick={() => remove(r)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
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
