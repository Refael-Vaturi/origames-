export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          player_id: string
          player_name: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          player_id: string
          player_name: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          player_id?: string
          player_name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_hints: {
        Row: {
          created_at: string
          hint_round: number
          hint_text: string
          id: string
          player_id: string
          round_id: string
        }
        Insert: {
          created_at?: string
          hint_round: number
          hint_text: string
          id?: string
          player_id: string
          round_id: string
        }
        Update: {
          created_at?: string
          hint_round?: number
          hint_text?: string
          id?: string
          player_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_hints_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rounds: {
        Row: {
          created_at: string
          fake_player_id: string
          id: string
          room_id: string
          round_number: number
          word_en: string
          word_he: string
        }
        Insert: {
          created_at?: string
          fake_player_id: string
          id?: string
          room_id: string
          round_number?: number
          word_en: string
          word_he: string
        }
        Update: {
          created_at?: string
          fake_player_id?: string
          id?: string
          room_id?: string
          round_number?: number
          word_en?: string
          word_he?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          created_at: string
          id: string
          player_id: string
          points: number
          reason: string
          room_id: string
          round_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          points?: number
          reason: string
          room_id: string
          round_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          points?: number
          reason?: string
          room_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      game_votes: {
        Row: {
          created_at: string
          id: string
          round_id: string
          voted_player_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          round_id: string
          voted_player_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          round_id?: string
          voted_player_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      iron_dome_progress: {
        Row: {
          best_wave: number
          created_at: string
          id: string
          max_level: number
          stars: Json
          updated_at: string
          upgrades: Json
          user_id: string
        }
        Insert: {
          best_wave?: number
          created_at?: string
          id?: string
          max_level?: number
          stars?: Json
          updated_at?: string
          upgrades?: Json
          user_id: string
        }
        Update: {
          best_wave?: number
          created_at?: string
          id?: string
          max_level?: number
          stars?: Json
          updated_at?: string
          upgrades?: Json
          user_id?: string
        }
        Relationships: []
      }
      iron_dome_scores: {
        Row: {
          country: string | null
          created_at: string
          display_name: string
          id: string
          max_combo: number
          mode: string
          score: number
          survival_time: number
          user_id: string
          wave: number
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          max_combo?: number
          mode?: string
          score?: number
          survival_time?: number
          user_id: string
          wave?: number
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          max_combo?: number
          mode?: string
          score?: number
          survival_time?: number
          user_id?: string
          wave?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      player_credits: {
        Row: {
          created_at: string
          credits: number
          id: string
          total_purchased: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          total_purchased?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          total_purchased?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_skill: {
        Row: {
          accuracy: number
          avg_survival_time: number
          avg_wave_reached: number
          created_at: string
          games_played: number
          id: string
          skill_rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number
          avg_survival_time?: number
          avg_wave_reached?: number
          created_at?: string
          games_played?: number
          id?: string
          skill_rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number
          avg_survival_time?: number
          avg_wave_reached?: number
          created_at?: string
          games_played?: number
          id?: string
          skill_rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          fakes_caught: number
          games_played: number
          id: string
          last_seen: string | null
          level: number
          survived: number
          updated_at: string
          user_id: string
          username: string | null
          wins: number
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          fakes_caught?: number
          games_played?: number
          id?: string
          last_seen?: string | null
          level?: number
          survived?: number
          updated_at?: string
          user_id: string
          username?: string | null
          wins?: number
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          fakes_caught?: number
          games_played?: number
          id?: string
          last_seen?: string | null
          level?: number
          survived?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string
        }
        Relationships: []
      }
      room_guest_sessions: {
        Row: {
          created_at: string
          id: string
          room_player_id: string
          session_token: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_player_id: string
          session_token: string
        }
        Update: {
          created_at?: string
          id?: string
          room_player_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_guest_sessions_room_player_id_fkey"
            columns: ["room_player_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
        ]
      }
      room_players: {
        Row: {
          guest_avatar: string | null
          guest_name: string | null
          id: string
          is_guest: boolean
          is_ready: boolean
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          guest_avatar?: string | null
          guest_name?: string | null
          id?: string
          is_guest?: boolean
          is_ready?: boolean
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          guest_avatar?: string | null
          guest_name?: string | null
          id?: string
          is_guest?: boolean
          is_ready?: boolean
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          discussion_time: number
          host_id: string
          id: string
          is_private: boolean
          max_players: number
          name: string
          response_time: number
          rounds: number
          status: string
          vote_time: number
        }
        Insert: {
          code: string
          created_at?: string
          discussion_time?: number
          host_id: string
          id?: string
          is_private?: boolean
          max_players?: number
          name?: string
          response_time?: number
          rounds?: number
          status?: string
          vote_time?: number
        }
        Update: {
          code?: string
          created_at?: string
          discussion_time?: number
          host_id?: string
          id?: string
          is_private?: boolean
          max_players?: number
          name?: string
          response_time?: number
          rounds?: number
          status?: string
          vote_time?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_profile_stat: {
        Args: { p_amount: number; p_field: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
