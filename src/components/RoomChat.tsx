import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  player_name: string;
  message: string;
  created_at: string;
}

interface RoomChatProps {
  roomId: string;
  playerId: string;
  playerName: string;
  maxHeight?: string;
}

const RoomChat = ({ roomId, playerId, playerName, maxHeight = "200px" }: RoomChatProps) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch existing messages
    supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as unknown as ChatMessage[]);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    await supabase.from("chat_messages").insert({
      room_id: roomId,
      player_id: playerId,
      player_name: playerName,
      message: text,
    } as any);
  };

  return (
    <div className="flex flex-col">
      <div
        ref={scrollRef}
        className="overflow-y-auto space-y-2 mb-2"
        style={{ maxHeight }}
      >
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground font-body text-center py-2">
            {t("lobby.chatPlaceholder")}
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.player_id === playerId;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-foreground shadow-card rounded-bl-sm"
                }`}
              >
                {!isMe && (
                  <span className="text-[10px] font-display font-bold text-primary block mb-0.5">
                    {msg.player_name}
                  </span>
                )}
                <p className="text-sm font-body">{msg.message}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("lobby.chatPlaceholder")}
          className="flex-1 h-11 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={handleSend}
          className="h-11 w-11 rounded-2xl gradient-hero flex items-center justify-center text-primary-foreground"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RoomChat;
