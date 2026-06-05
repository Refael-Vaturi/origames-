import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/adminLog";

type Type = "info" | "warning" | "promo";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<Type>("info");
  const [active, setActive] = useState(true);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-announcements"] });

  const create = async () => {
    if (!title.trim()) return toast.error("Title is required");
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim() || null,
      type,
      is_active: active,
      created_by: user?.email,
    });
    if (error) return toast.error(error.message);
    await logAdminAction({
      adminEmail: user!.email!,
      actionType: "create_announcement",
      details: { title: title.trim(), type },
    });
    toast.success("Announcement published");
    setTitle("");
    setBody("");
    refresh();
  };

  const toggle = async (a: Announcement) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (a: Announcement) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      adminEmail: user!.email!,
      actionType: "delete_announcement",
      details: { title: a.title },
    });
    toast.success("Deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6" /> Announcements
        </h1>
        <p className="text-sm text-muted-foreground">
          Global messages shown to every visitor of the portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New game released!"
              maxLength={120}
            />
          </div>
          <div className="grid gap-2">
            <Label>Body (optional)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Try out our new CityFind experience…"
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="promo">Promo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={active} onCheckedChange={setActive} id="active" />
              <Label htmlFor="active">Active immediately</Label>
            </div>
          </div>
          <Button onClick={create} className="w-full">
            Publish
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && !items?.length && (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
          {items?.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 border border-border rounded-lg p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{a.title}</span>
                  <Badge variant={a.is_active ? "default" : "secondary"}>
                    {a.is_active ? "active" : "off"}
                  </Badge>
                  <Badge variant="outline">{a.type}</Badge>
                </div>
                {a.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.body}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} />
                <Button variant="ghost" size="icon" onClick={() => remove(a)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
