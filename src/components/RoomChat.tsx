import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const QUICK_REACTIONS = [
  { emoji: "👍", label: "like" },
  { emoji: "😂", label: "laugh" },
  { emoji: "🤔", label: "think" },
  { emoji: "🕵️", label: "suspect" },
  { emoji: "😱", label: "shock" },
  { emoji: "🔥", label: "fire" },
];

const EMOJI_PICKER = [
  "😀", "😂", "🤣", "😎", "🤩", "😈",
  "🤔", "🧐", "🕵️", "👀", "😱", "🤯",
  "👍", "👎", "👏", "🔥", "💀", "🎯",
  "❤️", "💔", "🤝", "✅", "❌", "⚡",
];

const RoomChat = ({ roomId, playerId, playerName, maxHeight = "200px" }: RoomChatProps) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as unknown as ChatMessage[]);
      });

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

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setInput("");
    setShowEmojis(false);
    await supabase.from("chat_messages").insert({
      room_id: roomId,
      player_id: playerId,
      player_name: playerName,
      message: text.trim(),
    } as any);
  };

  const handleSend = () => sendMessage(input);

  const handleQuickReaction = (emoji: string) => sendMessage(emoji);

  const handleEmojiInsert = (emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const isEmojiOnly = (text: string) => {
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Component}\s]+$/u;
    return emojiRegex.test(text) && text.trim().length <= 6;
  };

  return (
    <div className="flex flex-col">
      {/* Quick reactions bar */}
      <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
        {QUICK_REACTIONS.map(({ emoji, label }) => (
          <button
            key={label}
            onClick={() => handleQuickReaction(emoji)}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-card shadow-card hover:bg-muted hover:scale-110 active:scale-95 transition-all duration-150 flex items-center justify-center text-lg"
            title={label}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Messages */}
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
          const emojiMsg = isEmojiOnly(msg.message);
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              {emojiMsg ? (
                <motion.span
                  className="text-4xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {msg.message}
                </motion.span>
              ) : (
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
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-8 gap-1 p-2 mb-2 bg-card rounded-2xl shadow-card">
              {EMOJI_PICKER.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiInsert(emoji)}
                  className="w-8 h-8 rounded-lg hover:bg-muted active:scale-90 transition-all duration-100 flex items-center justify-center text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowEmojis(!showEmojis)}
          className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-colors ${
            showEmojis ? "bg-primary text-primary-foreground" : "bg-card shadow-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          ref={inputRef}
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
