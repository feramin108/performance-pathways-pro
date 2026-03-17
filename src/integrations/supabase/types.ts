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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string
          evaluation_id: string | null
          id: string
          ip_address: string
          performed_by: string | null
          performed_by_name: string
          performed_by_role: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string
          evaluation_id?: string | null
          id?: string
          ip_address?: string
          performed_by?: string | null
          performed_by_name?: string
          performed_by_role?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string
          evaluation_id?: string | null
          id?: string
          ip_address?: string
          performed_by?: string | null
          performed_by_name?: string
          performed_by_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      department_kpis: {
        Row: {
          category: string
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          max_rating: number
          name: string
          sort_order: number
          weight: number
        }
        Insert: {
          category?: string
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          max_rating?: number
          name: string
          sort_order?: number
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          max_rating?: number
          name?: string
          sort_order?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "department_kpis_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_managers: {
        Row: {
          created_at: string
          department_id: string
          id: string
          manager_user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          manager_user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          manager_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_managers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      evaluation_cycles: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          start_date: string | null
          status: string
          title: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          title: string
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          title?: string
          year?: number
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          approved_at: string | null
          areas_for_improvement: string
          career_path_preferences: string
          classification: string
          created_at: string
          cycle_id: string | null
          department: string
          employee_comments: string
          employee_id: string
          employee_name: string
          evaluation_year: number
          hr_remarks: string
          id: string
          is_sales_staff: boolean
          job_title: string
          longevity: string
          manager_remarks: string
          marital_status: string
          proposed_action_plan: string
          qualification: string
          status: string
          submitted_at: string | null
          total_score: number
          training_needs: string
          unit: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          areas_for_improvement?: string
          career_path_preferences?: string
          classification?: string
          created_at?: string
          cycle_id?: string | null
          department?: string
          employee_comments?: string
          employee_id: string
          employee_name?: string
          evaluation_year: number
          hr_remarks?: string
          id?: string
          is_sales_staff?: boolean
          job_title?: string
          longevity?: string
          manager_remarks?: string
          marital_status?: string
          proposed_action_plan?: string
          qualification?: string
          status?: string
          submitted_at?: string | null
          total_score?: number
          training_needs?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          areas_for_improvement?: string
          career_path_preferences?: string
          classification?: string
          created_at?: string
          cycle_id?: string | null
          department?: string
          employee_comments?: string
          employee_id?: string
          employee_name?: string
          evaluation_year?: number
          hr_remarks?: string
          id?: string
          is_sales_staff?: boolean
          job_title?: string
          longevity?: string
          manager_remarks?: string
          marital_status?: string
          proposed_action_plan?: string
          qualification?: string
          status?: string
          submitted_at?: string | null
          total_score?: number
          training_needs?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_entries: {
        Row: {
          category: string
          comment: string
          created_at: string
          evaluation_id: string
          id: string
          rating: number
          sort_order: number
          title: string
        }
        Insert: {
          category: string
          comment?: string
          created_at?: string
          evaluation_id: string
          id?: string
          rating?: number
          sort_order?: number
          title?: string
        }
        Update: {
          category?: string
          comment?: string
          created_at?: string
          evaluation_id?: string
          id?: string
          rating?: number
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_entries_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          job_title: string
          longevity: string
          manager_id: string | null
          manager_name: string
          marital_status: string
          qualification: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          job_title?: string
          longevity?: string
          manager_id?: string | null
          manager_name?: string
          marital_status?: string
          qualification?: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          job_title?: string
          longevity?: string
          manager_id?: string | null
          manager_name?: string
          marital_status?: string
          qualification?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "employee" | "manager" | "hr" | "admin"
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
      app_role: ["employee", "manager", "hr", "admin"],
    },
  },
} as const
