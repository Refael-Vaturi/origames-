import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone, AlertTriangle, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_active: boolean;
  image_url: string | null;
  link_url: string | null;
}

const DISMISS_KEY = "ori-dismissed-announcements";

export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,body,type,is_active,image_url,link_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      setItems((data ?? []) as Announcement[]);
    })();
  }, []);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  const visible = items.filter((i) => !dismissed.includes(i.id));
  if (!visible.length) return null;

  const a = visible[0];
  const Icon =
    a.type === "warning" ? AlertTriangle :
    a.type === "promo" ? Sparkles :
    Megaphone;
  const tone =
    a.type === "warning" ? "from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-100" :
    a.type === "promo"   ? "from-fuchsia-500/20 to-purple-600/10 border-fuchsia-500/40 text-fuchsia-100" :
                           "from-sky-500/20 to-blue-600/10 border-sky-500/40 text-sky-100";

  // Wrap content in a link if link_url provided
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    a.link_url ? (
      <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-95">
        {children}
      </a>
    ) : <>{children}</>;

  return (
    <AnimatePresence>
      <motion.div
        key={a.id}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className={`relative w-full bg-gradient-to-r ${tone} border-b backdrop-blur`}
      >
        <button
          aria-label="Dismiss"
          onClick={() => dismiss(a.id)}
          className="absolute top-2 right-2 z-10 p-1 rounded hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
        <Wrapper>
          <div className="flex items-start gap-3 px-4 py-3 pr-10">
            {a.image_url ? (
              <img
                src={a.image_url}
                alt=""
                className="w-12 h-12 rounded object-cover flex-shrink-0"
                loading="lazy"
              />
            ) : (
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm flex items-center gap-1">
                {a.title}
                {a.link_url && <ExternalLink className="w-3 h-3 opacity-70" />}
              </div>
              {a.body && <div className="text-xs opacity-90 mt-0.5 line-clamp-2">{a.body}</div>}
            </div>
          </div>
        </Wrapper>
      </motion.div>
    </AnimatePresence>
  );
}
