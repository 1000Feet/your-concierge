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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          arrival_date: string | null
          created_at: string
          departure_date: string | null
          email: string | null
          first_name: string
          hotel: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_date?: string | null
          created_at?: string
          departure_date?: string | null
          email?: string | null
          first_name: string
          hotel?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_date?: string | null
          created_at?: string
          departure_date?: string | null
          email?: string | null
          first_name?: string
          hotel?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          channel: Database["public"]["Enums"]["conversation_channel"]
          client_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          provider_id: string | null
          request_id: string | null
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["conversation_channel"]
          client_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          provider_id?: string | null
          request_id?: string | null
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["conversation_channel"]
          client_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          provider_id?: string | null
          request_id?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["template_category"]
          created_at: string
          id: string
          is_default: boolean
          name: string
          subject: string | null
          updated_at: string
          user_id: string
          variables: string[] | null
        }
        Insert: {
          body: string
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          subject?: string | null
          updated_at?: string
          user_id: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_ai_generated: boolean
          is_read: boolean
          metadata: Json | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_read?: boolean
          metadata?: Json | null
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_read?: boolean
          metadata?: Json | null
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string
          current_bookings: number
          date: string
          end_time: string | null
          id: string
          max_capacity: number
          notes: string | null
          provider_id: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_bookings?: number
          date: string
          end_time?: string | null
          id?: string
          max_capacity?: number
          notes?: string | null
          provider_id: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_bookings?: number
          date?: string
          end_time?: string | null
          id?: string
          max_capacity?: number
          notes?: string | null
          provider_id?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          category: Database["public"]["Enums"]["provider_category"]
          commission_pct: number | null
          created_at: string
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          reliability: number | null
          tiktok: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["provider_category"]
          commission_pct?: number | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          reliability?: number | null
          tiktok?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["provider_category"]
          commission_pct?: number | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          reliability?: number | null
          tiktok?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      request_providers: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          provider_id: string
          quoted_price: number | null
          request_id: string
          status: Database["public"]["Enums"]["request_provider_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          provider_id: string
          quoted_price?: number | null
          request_id: string
          status?: Database["public"]["Enums"]["request_provider_status"]
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          provider_id?: string
          quoted_price?: number | null
          request_id?: string
          status?: Database["public"]["Enums"]["request_provider_status"]
        }
        Relationships: [
          {
            foreignKeyName: "request_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_providers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          request_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          request_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          description: string
          final_price: number | null
          group_size: number | null
          id: string
          margin: number | null
          notes: string | null
          service_date: string | null
          service_time: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description: string
          final_price?: number | null
          group_size?: number | null
          id?: string
          margin?: number | null
          notes?: string | null
          service_date?: string | null
          service_time?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string
          final_price?: number | null
          group_size?: number | null
          id?: string
          margin?: number | null
          notes?: string | null
          service_date?: string | null
          service_time?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      conversation_channel: "in_app" | "whatsapp" | "email"
      message_sender_type: "concierge" | "client" | "provider" | "system"
      provider_category:
        | "tour"
        | "chef"
        | "transfer"
        | "yacht"
        | "surf"
        | "babysitter"
        | "restaurant"
        | "wellness"
        | "other"
      request_provider_status: "pending" | "contacted" | "accepted" | "declined"
      request_status:
        | "draft"
        | "sent"
        | "waiting"
        | "confirmed"
        | "completed"
        | "cancelled"
      service_type:
        | "tour"
        | "chef"
        | "transfer"
        | "yacht"
        | "surf"
        | "babysitter"
        | "restaurant"
        | "wellness"
        | "other"
      template_category:
        | "client_proposal"
        | "provider_inquiry"
        | "follow_up"
        | "confirmation"
        | "cancellation"
        | "welcome"
        | "other"
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
    Enums: {
      conversation_channel: ["in_app", "whatsapp", "email"],
      message_sender_type: ["concierge", "client", "provider", "system"],
      provider_category: [
        "tour",
        "chef",
        "transfer",
        "yacht",
        "surf",
        "babysitter",
        "restaurant",
        "wellness",
        "other",
      ],
      request_provider_status: ["pending", "contacted", "accepted", "declined"],
      request_status: [
        "draft",
        "sent",
        "waiting",
        "confirmed",
        "completed",
        "cancelled",
      ],
      service_type: [
        "tour",
        "chef",
        "transfer",
        "yacht",
        "surf",
        "babysitter",
        "restaurant",
        "wellness",
        "other",
      ],
      template_category: [
        "client_proposal",
        "provider_inquiry",
        "follow_up",
        "confirmation",
        "cancellation",
        "welcome",
        "other",
      ],
    },
  },
} as const
