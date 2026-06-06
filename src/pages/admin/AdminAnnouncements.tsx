import { useRef, useState } from "react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Megaphone, Upload, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/adminLog";

type Type = "info" | "warning" | "promo";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_active: boolean;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
}

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<Type>("info");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as Announcement[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-announcements"] });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("announcements").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("announcements").getPublicUrl(path);
      setImageUrl(publicUrl);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const create = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
      return toast.error("Link must start with http:// or https://");
    }
    const { error } = await (supabase.from as any)("announcements").insert({
      title: title.trim(),
      body: body.trim() || null,
      type,
      is_active: active,
      image_url: imageUrl || null,
      link_url: linkUrl || null,
      created_by: user?.email,
    });
    if (error) return toast.error(error.message);
    await logAdminAction({
      adminEmail: user!.email!,
      actionType: "create_announcement",
      details: { title: title.trim(), type, hasImage: !!imageUrl, hasLink: !!linkUrl },
    });
    toast.success("Announcement published");
    setTitle(""); setBody(""); setImageUrl(""); setLinkUrl("");
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
          Global messages with optional image and clickable link.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>New announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New game released!" maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label>Body (optional)</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Try out our new mode…" maxLength={500} rows={3} />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Image (optional)</Label>
            <div className="flex gap-2 items-center">
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... or upload" />
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0]; if (f) uploadImage(f);
              }} />
              <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> {uploading ? "..." : "Upload"}
              </Button>
            </div>
            {imageUrl && <img src={imageUrl} alt="" className="h-24 rounded border" />}
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1"><LinkIcon className="w-4 h-4" /> Clickable link (optional)</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" type="url" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
          <Button onClick={create} className="w-full">Publish</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All announcements</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && !items?.length && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
          {items?.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 border border-border rounded-lg p-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {a.image_url && <img src={a.image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{a.title}</span>
                    <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "active" : "off"}</Badge>
                    <Badge variant="outline">{a.type}</Badge>
                    {a.link_url && (
                      <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate max-w-[200px]">
                        {a.link_url}
                      </a>
                    )}
                  </div>
                  {a.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
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
