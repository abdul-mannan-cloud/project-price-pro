export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contractor_settings: {
        Row: {
          ai_prompt_template: string | null
          created_at: string | null
          id: string
          markup_percentage: number | null
          minimum_project_cost: number | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          ai_prompt_template?: string | null
          created_at?: string | null
          id: string
          markup_percentage?: number | null
          minimum_project_cost?: number | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_prompt_template?: string | null
          created_at?: string | null
          id?: string
          markup_percentage?: number | null
          minimum_project_cost?: number | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_settings_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          }
        ]
      }
      contractors: {
        Row: {
          branding_colors: Json | null
          business_logo_url: string | null
          business_name: string
          contact_email: string
          contact_phone: string | null
          created_at: string | null
          id: string
          subscription_status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string | null
        }
        Insert: {
          branding_colors?: Json | null
          business_logo_url?: string | null
          business_name: string
          contact_email: string
          contact_phone?: string | null
          created_at?: string | null
          id: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
        }
        Update: {
          branding_colors?: Json | null
          business_logo_url?: string | null
          business_name?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          contractor_id: string | null
          category: string | null
          answers: Json | null
          estimate_data: Json | null
          project_title: string
          project_description: string | null
          project_address: string | null
          user_name: string | null
          user_email: string | null
          user_phone: string | null
          estimated_cost: number | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          contractor_id?: string | null
          category?: string | null
          answers?: Json | null
          estimate_data?: Json | null
          project_title: string
          project_description?: string | null
          project_address?: string | null
          user_name?: string | null
          user_email?: string | null
          user_phone?: string | null
          estimated_cost?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          contractor_id?: string | null
          category?: string | null
          answers?: Json | null
          estimate_data?: Json | null
          project_title?: string
          project_description?: string | null
          project_address?: string | null
          user_name?: string | null
          user_email?: string | null
          user_phone?: string | null
          estimated_cost?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          }
        ]
      }
      Options: {
        Row: {
          "Key Options": string
          "Kitchen Remodel": Json | null
          "Flooring Installation": Json | null
          "Fence Installation": Json | null
          "Painting": Json | null
          "Major Renovation": Json | null
          "Landscaping": Json | null
          "Electrician": Json | null
          "Plumber": Json | null
          "Door & Window": Json | null
          "Concrete": Json | null
          "Appliances": Json | null
          "Repairs": Json | null
          "Carpenter": Json | null
          "Deck & porch": Json | null
          "Moving": Json | null
          "Drywall": Json | null
          "Demolition": Json | null
          "Mold remediation": Json | null
        }
        Insert: {
          "Key Options": string
          "Kitchen Remodel"?: Json | null
          "Flooring Installation"?: Json | null
          "Fence Installation"?: Json | null
          "Painting"?: Json | null
          "Major Renovation"?: Json | null
          "Landscaping"?: Json | null
          "Electrician"?: Json | null
          "Plumber"?: Json | null
          "Door & Window"?: Json | null
          "Concrete"?: Json | null
          "Appliances"?: Json | null
          "Repairs"?: Json | null
          "Carpenter"?: Json | null
          "Deck & porch"?: Json | null
          "Moving"?: Json | null
          "Drywall"?: Json | null
          "Demolition"?: Json | null
          "Mold remediation"?: Json | null
        }
        Update: {
          "Key Options"?: string
          "Kitchen Remodel"?: Json | null
          "Flooring Installation"?: Json | null
          "Fence Installation"?: Json | null
          "Painting"?: Json | null
          "Major Renovation"?: Json | null
          "Landscaping"?: Json | null
          "Electrician"?: Json | null
          "Plumber"?: Json | null
          "Door & Window"?: Json | null
          "Concrete"?: Json | null
          "Appliances"?: Json | null
          "Repairs"?: Json | null
          "Carpenter"?: Json | null
          "Deck & porch"?: Json | null
          "Moving"?: Json | null
          "Drywall"?: Json | null
          "Demolition"?: Json | null
          "Mold remediation"?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_status: "active" | "inactive" | "trial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
