import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Send, CheckCircle2, History } from "lucide-react";

interface ProposedChange {
  key: string;
  value: unknown;
  description?: string;
}

interface GeminiResponse {
  summary: string;
  changes: ProposedChange[];
  appliedCount?: number;
  error?: string;
}

export default function AdminAI() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<GeminiResponse | null>(null);
  const [applying, setApplying] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key,value,description,updated_at")
        .order("key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["ai_admin_edits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_admin_edits")
        .select("id,prompt,changes,applied,created_at,admin_email")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const run = async (apply: boolean) => {
    const p = prompt.trim();
    if (!p) return toast.error("כתוב מה לשנות");
    apply ? setApplying(true) : setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<GeminiResponse>(
        "gemini-admin-edit",
        { body: { prompt: p, apply } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProposal(data ?? null);
      if (apply) {
        toast.success(`עודכנו ${data?.appliedCount ?? 0} שדות`);
        setPrompt("");
        qc.invalidateQueries({ queryKey: ["site_settings"] });
      }
      qc.invalidateQueries({ queryKey: ["ai_admin_edits"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> AI Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          כתוב בשפה חופשית מה לשנות באתר (טקסטים, באנרים, הגדרות תצוגה). Gemini
          יציע שינויים למאגר <code className="text-xs">site_settings</code>, ואתה תאשר.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">בקשה חדשה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="דוגמה: שנה את הכותרת של הפורטל ל‑'משחקי אורי — עכשיו עם 15 משחקים', הצג באנר עליון 'סוף השבוע דאבל קרדיטים!' והסתר את חנות הקרדיטים בכיפת ברזל."
            rows={5}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => run(false)} disabled={loading || applying}>
              <Send className="w-4 h-4 mr-2" />
              {loading ? "מציע…" : "הצע שינויים"}
            </Button>
            <Button onClick={() => run(true)} disabled={loading || applying}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {applying ? "מחיל…" : "הצע והחל מיד"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {proposal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">הצעת Gemini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{proposal.summary}</p>
            {proposal.changes.length === 0 ? (
              <p className="text-muted-foreground text-sm">אין שינויים.</p>
            ) : (
              <div className="space-y-2">
                {proposal.changes.map((c) => (
                  <div key={c.key} className="border border-border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs font-mono text-primary">{c.key}</code>
                      {c.description && (
                        <span className="text-xs text-muted-foreground">{c.description}</span>
                      )}
                    </div>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(c.value, null, 2)}
                    </pre>
                  </div>
                ))}
                {typeof proposal.appliedCount === "number" && proposal.appliedCount > 0 && (
                  <Badge variant="default">
                    {proposal.appliedCount} שדות הוחלו
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site settings — {settings?.length ?? 0} מפתחות</CardTitle>
        </CardHeader>
        <CardContent>
          {!settings?.length ? (
            <p className="text-sm text-muted-foreground">ריק. הרץ את הבקשה הראשונה שלך למעלה.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {settings.map((s) => (
                <div key={s.key} className="border border-border rounded-md p-2 text-xs">
                  <code className="text-primary">{s.key}</code>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(s.value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" /> היסטוריה
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!history?.length ? (
            <p className="text-sm text-muted-foreground">אין עדיין בקשות.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="border border-border rounded-md p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleString()} · {h.admin_email}
                    </span>
                    <Badge variant={h.applied ? "default" : "outline"}>
                      {h.applied ? "הוחל" : "הצעה בלבד"}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap">{h.prompt}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
