import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Gamepad2, UserPlus, Info, X, Trash2 } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { playPop } from "@/hooks/useSound";

const typeIcons: Record<string, typeof Bell> = {
  game_invite: Gamepad2,
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  info: Info,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllRead, deleteNotification, clearAll, requestPushPermission } =
    useNotifications();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && "Notification" in window && window.Notification.permission === "default") {
      requestPushPermission();
    }
  }, [open, requestPushPermission]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    playPop();

    const data = notif.data as Record<string, string>;
    if (notif.type === "game_invite" && data?.roomCode) {
      navigate(`/join?code=${data.roomCode}`);
      setOpen(false);
    } else if (notif.type === "friend_request" || notif.type === "friend_accepted") {
      navigate("/friends");
      setOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
    playPop();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          playPop();
        }}
        className="relative p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -end-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-display font-bold flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute end-0 top-full mt-2 w-80 max-h-96 bg-card rounded-2xl shadow-lg border border-border overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-display font-bold text-sm text-foreground">
                {t("notifications.title")}
              </h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-destructive font-body hover:underline flex items-center gap-1"
                    title={t("notifications.clearAll")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary font-body hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {t("notifications.markAll")}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground font-body">
                    {t("notifications.empty")}
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = typeIcons[notif.type] || Bell;
                  return (
                    <motion.div
                      key={notif.id}
                      className={`group w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 cursor-pointer ${
                        !notif.is_read ? "bg-primary/5" : ""
                      }`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          !notif.is_read
                            ? "gradient-hero text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-body leading-snug ${
                            !notif.is_read
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-xs text-muted-foreground font-body mt-0.5 truncate">
                            {notif.body}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 font-body mt-1">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        )}
                        <button
                          onClick={(e) => handleDelete(e, notif.id)}
                          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
