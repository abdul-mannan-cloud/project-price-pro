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
          },
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
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
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
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
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
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      estimate_details: {
        Row: {
          created_at: string | null
          estimate_id: string | null
          group_name: string
          id: string
          line_items: Json
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimate_id?: string | null
          group_name: string
          id?: string
          line_items: Json
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimate_id?: string | null
          group_name?: string
          id?: string
          line_items?: Json
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_details_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_questions: {
        Row: {
          created_at: string | null
          estimate_id: string | null
          id: string
          is_follow_up: boolean | null
          options: Json
          parent_question_id: string | null
          question: string
          question_order: number
          question_type: Database["public"]["Enums"]["question_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimate_id?: string | null
          id?: string
          is_follow_up?: boolean | null
          options: Json
          parent_question_id?: string | null
          question: string
          question_order?: number
          question_type?: Database["public"]["Enums"]["question_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimate_id?: string | null
          id?: string
          is_follow_up?: boolean | null
          options?: Json
          parent_question_id?: string | null
          question?: string
          question_order?: number
          question_type?: Database["public"]["Enums"]["question_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_questions_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_questions_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "estimate_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_responses: {
        Row: {
          created_at: string | null
          estimate_id: string | null
          id: string
          question_id: string | null
          response: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimate_id?: string | null
          id?: string
          question_id?: string | null
          response: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimate_id?: string | null
          id?: string
          question_id?: string | null
          response?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_responses_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "estimate_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          contractor_id: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          project_address: string | null
          project_description: string | null
          project_title: string
          status: string | null
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          project_address?: string | null
          project_description?: string | null
          project_title: string
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          project_address?: string | null
          project_description?: string | null
          project_title?: string
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      Options: {
        Row: {
          "Key Options": string
          "Question 1": Json | null
          "Question 2": Json | null
          "Question 3": Json | null
          "Question 4": Json | null
        }
        Insert: {
          "Key Options"?: string
          "Question 1"?: Json | null
          "Question 2"?: Json | null
          "Question 3"?: Json | null
          "Question 4"?: Json | null
        }
        Update: {
          "Key Options"?: string
          "Question 1"?: Json | null
          "Question 2"?: Json | null
          "Question 3"?: Json | null
          "Question 4"?: Json | null
        }
        Relationships: []
      }
      question_templates: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          options: Json
          question: string
          question_type: Database["public"]["Enums"]["question_template_type"]
          task: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          options?: Json
          question: string
          question_type?: Database["public"]["Enums"]["question_template_type"]
          task: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          options?: Json
          question?: string
          question_type?: Database["public"]["Enums"]["question_template_type"]
          task?: string
          updated_at?: string | null
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
      question_template_type: "single_choice" | "multi_choice"
      question_type: "multiple_choice" | "multi_select" | "yes_no"
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
