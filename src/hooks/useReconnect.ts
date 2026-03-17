import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Checks if the current user (authenticated or guest) has an active game session.
 * If found, offers to reconnect them automatically.
 */
export const useReconnect = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [activeRoom, setActiveRoom] = useState<{ roomId: string; code: string; status: string } | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        // 1. Check authenticated user
        if (user) {
          const { data: myRooms } = await supabase
            .from("room_players")
            .select("room_id")
            .eq("user_id", user.id);

          if (myRooms && myRooms.length > 0) {
            const roomIds = myRooms.map((r) => r.room_id);
            const { data: rooms } = await supabase
              .from("rooms")
              .select("id, code, status")
              .in("id", roomIds)
              .in("status", ["playing", "waiting"]);

            if (rooms && rooms.length > 0) {
              // Prefer "playing" rooms over "waiting"
              const playing = rooms.find((r) => r.status === "playing");
              const room = playing || rooms[0];
              setActiveRoom({ roomId: room.id, code: room.code, status: room.status });
              setChecking(false);
              return;
            }
          }
        }

        // 2. Check guest sessions in localStorage
        if (!user) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("guest_room_")) {
              try {
                const session = JSON.parse(localStorage.getItem(key) || "");
                if (session?.roomCode && session?.playerId) {
                  const { data: room } = await supabase
                    .from("rooms")
                    .select("id, code, status")
                    .eq("code", session.roomCode)
                    .in("status", ["playing", "waiting"])
                    .single();

                  if (room) {
                    setActiveRoom({ roomId: room.id, code: room.code, status: room.status });
                    setChecking(false);
                    return;
                  } else {
                    // Room ended, clean up
                    localStorage.removeItem(key);
                  }
                }
              } catch {
                localStorage.removeItem(key!);
              }
            }
          }
        }
      } catch {
        // Silent fail
      }
      setChecking(false);
    };

    void check();
  }, [user]);

  const reconnect = () => {
    if (!activeRoom) return;
    if (activeRoom.status === "playing") {
      navigate("/game?room=" + activeRoom.roomId);
    } else {
      navigate("/lobby?code=" + activeRoom.code);
    }
    toast({ title: "🔄 Reconnected!" });
  };

  const dismiss = () => {
    setActiveRoom(null);
  };

  return { checking, activeRoom, reconnect, dismiss };
};
