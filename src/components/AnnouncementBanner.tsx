import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Info, AlertTriangle, Megaphone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  type: string;
}

const ICONS: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  promo: Megaphone,
};

const STYLES: Record<string, string> = {
  info: "bg-primary/10 border-primary/30 text-foreground",
  warning: "bg-amber-500/10 border-amber-500/40 text-foreground",
  promo: "bg-gradient-to-r from-[hsl(var(--game-pink)/0.15)] to-primary/15 border-primary/40 text-foreground",
};

export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("dismissed-announcements") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,body,type")
        .order("created_at", { ascending: false })
        .limit(5);
      if (active && data) setItems(data as Announcement[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed-announcements", JSON.stringify([...next]));
  };

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (!visible.length) return null;

  return (
    <div className="relative z-10 px-4 pt-3 space-y-2">
      <AnimatePresence>
        {visible.map((a) => {
          const Icon = ICONS[a.type] ?? Info;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`rounded-2xl border px-3 py-2.5 flex items-start gap-2 ${STYLES[a.type] ?? STYLES.info}`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm truncate">{a.title}</p>
                {a.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(a.id)}
                aria-label="Dismiss"
                className="p-1 rounded-md hover:bg-foreground/10 transition"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
