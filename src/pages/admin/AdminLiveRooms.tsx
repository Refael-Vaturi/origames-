import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Lock, Globe, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminAction } from "@/lib/adminLog";

interface Room {
  id: string; code: string; name: string; status: string;
  is_private: boolean; max_players: number; rounds: number; created_at: string;
}
interface RoomWithCount extends Room { player_count: number; }

export default function AdminLiveRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoomWithCount | null>(null);
  const [editForm, setEditForm] = useState({ name: "", max_players: 8, rounds: 3, status: "waiting", is_private: false });

  const load = async () => {
    const { data: roomsData } = await supabase
      .from("rooms")
      .select("id,code,name,status,is_private,max_players,rounds,created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (!roomsData) { setRooms([]); setLoading(false); return; }
    const withCounts = await Promise.all((roomsData as Room[]).map(async (r) => {
      const { count } = await supabase.from("room_players")
        .select("id", { count: "exact", head: true }).eq("room_id", r.id);
      return { ...r, player_count: count ?? 0 };
    }));
    setRooms(withCounts); setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel("admin-rooms-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (r: Room) => {
    if (!confirm(`Delete room "${r.name}" (${r.code})?`)) return;
    const { data, error } = await supabase.functions.invoke("admin-rpc", {
      body: { fn: "admin_delete_room", args: { p_room_id: r.id } },
    });
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    await logAdminAction({ adminEmail: user!.email!, actionType: "delete_room", details: { code: r.code, name: r.name } });
    toast.success("Room deleted"); load();
  };

  const openEdit = (r: RoomWithCount) => {
    setEditing(r);
    setEditForm({ name: r.name, max_players: r.max_players, rounds: r.rounds, status: r.status, is_private: r.is_private });
  };
  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await (supabase.rpc as any)("admin_update_room", {
      p_room_id: editing.id,
      p_name: editForm.name,
      p_max_players: editForm.max_players,
      p_rounds: editForm.rounds,
      p_status: editForm.status,
      p_is_private: editForm.is_private,
    });
    if (error) return toast.error(error.message);
    await logAdminAction({ adminEmail: user!.email!, actionType: "edit_room", details: editForm });
    toast.success("Updated"); setEditing(null); load();
  };

  const active = rooms.filter((r) => r.status !== "finished");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Live Fake It Fast Rooms</h1>
        <p className="text-sm text-muted-foreground">Realtime view; edit or delete any room.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-3xl">{active.length}</span>
            <span className="text-sm text-muted-foreground">active rooms</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Players</TableHead>
                <TableHead>Rounds</TableHead><TableHead>Status</TableHead><TableHead>Privacy</TableHead>
                <TableHead>Created</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
                {!loading && !rooms.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No rooms.</TableCell></TableRow>}
                {rooms.map((r) => (
                  <TableRow key={r.id} className="animate-fade-in">
                    <TableCell className="font-mono">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.player_count} / {r.max_players}</TableCell>
                    <TableCell>{r.rounds}</TableCell>
                    <TableCell><Badge variant={r.status === "waiting" ? "secondary" : "default"}>{r.status}</Badge></TableCell>
                    <TableCell>
                      {r.is_private
                        ? <span className="inline-flex items-center gap-1 text-xs"><Lock className="w-3 h-3" /> private</span>
                        : <span className="inline-flex items-center gap-1 text-xs"><Globe className="w-3 h-3" /> public</span>}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleTimeString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit room {editing?.code}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2"><Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2"><Label>Max players</Label>
                <Input type="number" min={2} max={20} value={editForm.max_players}
                  onChange={(e) => setEditForm({ ...editForm, max_players: parseInt(e.target.value) || 2 })} />
              </div>
              <div className="grid gap-2"><Label>Rounds</Label>
                <Input type="number" min={1} max={20} value={editForm.rounds}
                  onChange={(e) => setEditForm({ ...editForm, rounds: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="grid gap-2"><Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">waiting</SelectItem>
                  <SelectItem value="playing">playing</SelectItem>
                  <SelectItem value="finished">finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="priv" checked={editForm.is_private}
                onChange={(e) => setEditForm({ ...editForm, is_private: e.target.checked })} />
              <Label htmlFor="priv">Private</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
