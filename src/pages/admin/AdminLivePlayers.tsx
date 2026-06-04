import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useLanguage } from "@/contexts/LanguageContext";
import { Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const flagFor = (cc?: string | null) =>
  cc && cc.length === 2
    ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
    : "🌐";

export default function AdminLivePlayers() {
  const { t } = useLanguage();
  const { onlineUsers } = useOnlinePresence({ track: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Live Players</h1>
        <p className="text-sm text-muted-foreground">Real-time presence across the world</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-500 animate-pulse" />
            <span className="text-3xl">{onlineUsers.length}</span>
            <span className="text-sm text-muted-foreground">players online right now</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Connected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!onlineUsers.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No players online right now.
                    </TableCell>
                  </TableRow>
                )}
                {onlineUsers.map((u) => (
                  <TableRow key={u.user_id} className="animate-fade-in">
                    <TableCell className="font-medium">
                      {u.username ?? u.display_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{u.email ?? "—"}</TableCell>
                    <TableCell>
                      {flagFor(u.country_code)} {u.country ?? "Unknown"}
                    </TableCell>
                    <TableCell>{u.current_level ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        try {
                          return formatDistanceToNow(new Date(u.connected_at), {
                            addSuffix: true,
                          });
                        } catch {
                          return "—";
                        }
                      })()}
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
