import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Lock, Globe } from "lucide-react";

interface Room {
  id: string;
  code: string;
  name: string;
  status: string;
  is_private: boolean;
  max_players: number;
  rounds: number;
  created_at: string;
}

interface RoomWithCount extends Room {
  player_count: number;
}

export default function AdminLiveRooms() {
  const [rooms, setRooms] = useState<RoomWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: roomsData } = await supabase
      .from("rooms")
      .select("id,code,name,status,is_private,max_players,rounds,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!roomsData) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const withCounts = await Promise.all(
      (roomsData as Room[]).map(async (r) => {
        const { count } = await supabase
          .from("room_players")
          .select("id", { count: "exact", head: true })
          .eq("room_id", r.id);
        return { ...r, player_count: count ?? 0 };
      })
    );
    setRooms(withCounts);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-rooms-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = rooms.filter((r) => r.status !== "finished");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Live Fake It Fast Rooms</h1>
        <p className="text-sm text-muted-foreground">
          Realtime view of every active room.
        </p>
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
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Rounds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Privacy</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && !rooms.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No rooms.
                    </TableCell>
                  </TableRow>
                )}
                {rooms.map((r) => (
                  <TableRow key={r.id} className="animate-fade-in">
                    <TableCell className="font-mono">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>
                      {r.player_count} / {r.max_players}
                    </TableCell>
                    <TableCell>{r.rounds}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "waiting" ? "secondary" : "default"}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.is_private ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Lock className="w-3 h-3" /> private
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Globe className="w-3 h-3" /> public
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(r.created_at).toLocaleTimeString()}
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
