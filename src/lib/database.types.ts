export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          caption: string | null
          created_at: string
          height: number | null
          id: string
          position: number
          review_id: string | null
          shoe_id: string | null
          storage_path: string
          type: Database["public"]["Enums"]["media_type"]
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          review_id?: string | null
          shoe_id?: string | null
          storage_path: string
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          review_id?: string | null
          shoe_id?: string | null
          storage_path?: string
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_shoe_id_fkey"
            columns: ["shoe_id"]
            isOneToOne: false
            referencedRelation: "shoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          aspect: Database["public"]["Enums"]["rating_aspect"]
          created_at: string
          id: string
          review_id: string
          score: number
        }
        Insert: {
          aspect: Database["public"]["Enums"]["rating_aspect"]
          created_at?: string
          id?: string
          review_id: string
          score: number
        }
        Update: {
          aspect?: Database["public"]["Enums"]["rating_aspect"]
          created_at?: string
          id?: string
          review_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_verified_purchase: boolean
          overall_rating: number
          shoe_id: string
          size_purchased: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          overall_rating: number
          shoe_id: string
          size_purchased?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          overall_rating?: number
          shoe_id?: string
          size_purchased?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_shoe_id_fkey"
            columns: ["shoe_id"]
            isOneToOne: false
            referencedRelation: "shoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoe_components: {
        Row: {
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          description: string | null
          id: string
          material: string | null
          name: string | null
          shoe_id: string
          updated_at: string
        }
        Insert: {
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          description?: string | null
          id?: string
          material?: string | null
          name?: string | null
          shoe_id: string
          updated_at?: string
        }
        Update: {
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          description?: string | null
          id?: string
          material?: string | null
          name?: string | null
          shoe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoe_components_shoe_id_fkey"
            columns: ["shoe_id"]
            isOneToOne: false
            referencedRelation: "shoes"
            referencedColumns: ["id"]
          },
        ]
      }
      shoes: {
        Row: {
          brand_id: string
          category: Database["public"]["Enums"]["shoe_category"]
          created_at: string
          description: string | null
          drop_mm: number | null
          forefoot_stack_mm: number | null
          heel_stack_mm: number | null
          id: string
          image_url: string | null
          msrp_cents: number | null
          name: string
          release_year: number | null
          slug: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          brand_id: string
          category: Database["public"]["Enums"]["shoe_category"]
          created_at?: string
          description?: string | null
          drop_mm?: number | null
          forefoot_stack_mm?: number | null
          heel_stack_mm?: number | null
          id?: string
          image_url?: string | null
          msrp_cents?: number | null
          name: string
          release_year?: number | null
          slug: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          brand_id?: string
          category?: Database["public"]["Enums"]["shoe_category"]
          created_at?: string
          description?: string | null
          drop_mm?: number | null
          forefoot_stack_mm?: number | null
          heel_stack_mm?: number | null
          id?: string
          image_url?: string | null
          msrp_cents?: number | null
          name?: string
          release_year?: number | null
          slug?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shoes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
      component_type:
        | "upper"
        | "midsole"
        | "outsole"
        | "insole"
        | "plate"
        | "laces"
        | "tongue"
        | "heel_counter"
        | "other"
      media_type: "image" | "video"
      rating_aspect:
        | "comfort"
        | "cushioning"
        | "durability"
        | "fit"
        | "style"
        | "value"
        | "traction"
        | "breathability"
      shoe_category:
        | "running"
        | "racing"
        | "trail"
        | "walking"
        | "training"
        | "gym"
        | "hiking"
        | "lifestyle"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      component_type: [
        "upper",
        "midsole",
        "outsole",
        "insole",
        "plate",
        "laces",
        "tongue",
        "heel_counter",
        "other",
      ],
      media_type: ["image", "video"],
      rating_aspect: [
        "comfort",
        "cushioning",
        "durability",
        "fit",
        "style",
        "value",
        "traction",
        "breathability",
      ],
      shoe_category: [
        "running",
        "racing",
        "trail",
        "walking",
        "training",
        "gym",
        "hiking",
        "lifestyle",
      ],
    },
  },
} as const

