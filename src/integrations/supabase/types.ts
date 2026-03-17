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
          actor_id: string | null
          actor_role: string | null
          actor_username: string | null
          created_at: string | null
          evaluation_id: string | null
          id: string
          ip_address: string | null
          new_status: string | null
          notes: string | null
          old_status: string | null
          tamper_detected: boolean | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          actor_username?: string | null
          created_at?: string | null
          evaluation_id?: string | null
          id?: string
          ip_address?: string | null
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          tamper_detected?: boolean | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          actor_username?: string | null
          created_at?: string | null
          evaluation_id?: string | null
          id?: string
          ip_address?: string | null
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          tamper_detected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_reminders: {
        Row: {
          cycle_id: string | null
          id: string
          notes: string | null
          recipient_count: number | null
          recipient_type: string | null
          sent_at: string | null
          sent_by: string | null
        }
        Insert: {
          cycle_id?: string | null
          id?: string
          notes?: string | null
          recipient_count?: number | null
          recipient_type?: string | null
          sent_at?: string | null
          sent_by?: string | null
        }
        Update: {
          cycle_id?: string | null
          id?: string
          notes?: string | null
          recipient_count?: number | null
          recipient_type?: string | null
          sent_at?: string | null
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_reminders_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reminders_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_cycles: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          label: string
          manager_reminder_sent_at: string | null
          reminder_sent_at: string | null
          reminder_sent_by: string | null
          start_date: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          manager_reminder_sent_at?: string | null
          reminder_sent_at?: string | null
          reminder_sent_by?: string | null
          start_date?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          manager_reminder_sent_at?: string | null
          reminder_sent_at?: string | null
          reminder_sent_by?: string | null
          start_date?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_cycles_reminder_sent_by_fkey"
            columns: ["reminder_sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          a1_score_on_100: number | null
          a1_weighted: number | null
          a2_score_on_100: number | null
          a2_weighted: number | null
          ai_summary: string | null
          ai_summary_generated_at: string | null
          archived_at: string | null
          career_path: Json | null
          created_at: string | null
          cycle_id: string | null
          employee_comments: string | null
          employee_id: string
          employee_type: string | null
          final_classification: string | null
          final_score: number | null
          first_manager_id: string | null
          first_manager_remarks: string | null
          first_manager_reviewed_at: string | null
          gen_score_on_100: number | null
          gen_weighted: number | null
          hc_decision: string | null
          hc_remarks: string | null
          hc_reviewed_at: string | null
          hc_reviewer_id: string | null
          id: string
          key_areas_improvement: string | null
          last_revision_requested_at: string | null
          management_action: string | null
          proposed_action_plan: string | null
          revision_count: number | null
          revision_note: string | null
          score_hash: string | null
          score_locked_at: string | null
          score_tampered: boolean | null
          sec_score_on_100: number | null
          sec_weighted: number | null
          second_manager_id: string | null
          second_manager_remarks: string | null
          second_manager_required: boolean | null
          second_manager_reviewed_at: string | null
          stage_hc_review_started_at: string | null
          stage_manager_review_started_at: string | null
          stage_second_manager_started_at: string | null
          stage_submitted_at: string | null
          status: string | null
          submitted_at: string | null
          training_needs: Json | null
          updated_at: string | null
        }
        Insert: {
          a1_score_on_100?: number | null
          a1_weighted?: number | null
          a2_score_on_100?: number | null
          a2_weighted?: number | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          archived_at?: string | null
          career_path?: Json | null
          created_at?: string | null
          cycle_id?: string | null
          employee_comments?: string | null
          employee_id: string
          employee_type?: string | null
          final_classification?: string | null
          final_score?: number | null
          first_manager_id?: string | null
          first_manager_remarks?: string | null
          first_manager_reviewed_at?: string | null
          gen_score_on_100?: number | null
          gen_weighted?: number | null
          hc_decision?: string | null
          hc_remarks?: string | null
          hc_reviewed_at?: string | null
          hc_reviewer_id?: string | null
          id?: string
          key_areas_improvement?: string | null
          last_revision_requested_at?: string | null
          management_action?: string | null
          proposed_action_plan?: string | null
          revision_count?: number | null
          revision_note?: string | null
          score_hash?: string | null
          score_locked_at?: string | null
          score_tampered?: boolean | null
          sec_score_on_100?: number | null
          sec_weighted?: number | null
          second_manager_id?: string | null
          second_manager_remarks?: string | null
          second_manager_required?: boolean | null
          second_manager_reviewed_at?: string | null
          stage_hc_review_started_at?: string | null
          stage_manager_review_started_at?: string | null
          stage_second_manager_started_at?: string | null
          stage_submitted_at?: string | null
          status?: string | null
          submitted_at?: string | null
          training_needs?: Json | null
          updated_at?: string | null
        }
        Update: {
          a1_score_on_100?: number | null
          a1_weighted?: number | null
          a2_score_on_100?: number | null
          a2_weighted?: number | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          archived_at?: string | null
          career_path?: Json | null
          created_at?: string | null
          cycle_id?: string | null
          employee_comments?: string | null
          employee_id?: string
          employee_type?: string | null
          final_classification?: string | null
          final_score?: number | null
          first_manager_id?: string | null
          first_manager_remarks?: string | null
          first_manager_reviewed_at?: string | null
          gen_score_on_100?: number | null
          gen_weighted?: number | null
          hc_decision?: string | null
          hc_remarks?: string | null
          hc_reviewed_at?: string | null
          hc_reviewer_id?: string | null
          id?: string
          key_areas_improvement?: string | null
          last_revision_requested_at?: string | null
          management_action?: string | null
          proposed_action_plan?: string | null
          revision_count?: number | null
          revision_note?: string | null
          score_hash?: string | null
          score_locked_at?: string | null
          score_tampered?: boolean | null
          sec_score_on_100?: number | null
          sec_weighted?: number | null
          second_manager_id?: string | null
          second_manager_remarks?: string | null
          second_manager_required?: boolean | null
          second_manager_reviewed_at?: string | null
          stage_hc_review_started_at?: string | null
          stage_manager_review_started_at?: string | null
          stage_second_manager_started_at?: string | null
          stage_submitted_at?: string | null
          status?: string | null
          submitted_at?: string | null
          training_needs?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_first_manager_id_fkey"
            columns: ["first_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_hc_reviewer_id_fkey"
            columns: ["hc_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_second_manager_id_fkey"
            columns: ["second_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_entries: {
        Row: {
          anomaly_flagged: boolean | null
          category: string
          custom_title: string | null
          employee_comment: string | null
          employee_rating: number | null
          evaluation_id: string
          id: string
          kpi_goal_id: string | null
          kpi_template_id: string | null
          manager_comment: string | null
          manager_rating: number | null
          rating_gap: number | null
          sort_order: number | null
        }
        Insert: {
          anomaly_flagged?: boolean | null
          category: string
          custom_title?: string | null
          employee_comment?: string | null
          employee_rating?: number | null
          evaluation_id: string
          id?: string
          kpi_goal_id?: string | null
          kpi_template_id?: string | null
          manager_comment?: string | null
          manager_rating?: number | null
          rating_gap?: number | null
          sort_order?: number | null
        }
        Update: {
          anomaly_flagged?: boolean | null
          category?: string
          custom_title?: string | null
          employee_comment?: string | null
          employee_rating?: number | null
          evaluation_id?: string
          id?: string
          kpi_goal_id?: string | null
          kpi_template_id?: string | null
          manager_comment?: string | null
          manager_rating?: number | null
          rating_gap?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_entries_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_entries_kpi_goal_id_fkey"
            columns: ["kpi_goal_id"]
            isOneToOne: false
            referencedRelation: "kpi_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_entries_kpi_template_id_fkey"
            columns: ["kpi_template_id"]
            isOneToOne: false
            referencedRelation: "kpi_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_goals: {
        Row: {
          category: string
          created_at: string | null
          custom_title: string | null
          cycle_id: string
          employee_id: string
          goal_statement: string | null
          id: string
          kpi_template_id: string | null
          sort_order: number | null
          target_rating: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          custom_title?: string | null
          cycle_id: string
          employee_id: string
          goal_statement?: string | null
          id?: string
          kpi_template_id?: string | null
          sort_order?: number | null
          target_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          custom_title?: string | null
          cycle_id?: string
          employee_id?: string
          goal_statement?: string | null
          id?: string
          kpi_template_id?: string | null
          sort_order?: number | null
          target_rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_goals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_goals_kpi_template_id_fkey"
            columns: ["kpi_template_id"]
            isOneToOne: false
            referencedRelation: "kpi_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_templates: {
        Row: {
          category: string
          department_code: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          weight_nonsales: number | null
          weight_sales: number | null
        }
        Insert: {
          category: string
          department_code?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          weight_nonsales?: number | null
          weight_sales?: number | null
        }
        Update: {
          category?: string
          department_code?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          weight_nonsales?: number | null
          weight_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_templates_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["code"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          evaluation_id: string | null
          id: string
          is_read: boolean | null
          message: string | null
          recipient_id: string
          title: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          evaluation_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id: string
          title?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          evaluation_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_qualification: string | null
          ad_groups: Json | null
          branch: string | null
          created_at: string | null
          date_joining: string | null
          department: string | null
          email: string | null
          employee_id: string | null
          employee_type: string | null
          full_name: string
          function_role: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          last_login_at: string | null
          manager_id: string | null
          marital_status: string | null
          occupied_since: string | null
          previous_function: string | null
          second_manager_id: string | null
          sex: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          academic_qualification?: string | null
          ad_groups?: Json | null
          branch?: string | null
          created_at?: string | null
          date_joining?: string | null
          department?: string | null
          email?: string | null
          employee_id?: string | null
          employee_type?: string | null
          full_name?: string
          function_role?: string | null
          id: string
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          manager_id?: string | null
          marital_status?: string | null
          occupied_since?: string | null
          previous_function?: string | null
          second_manager_id?: string | null
          sex?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          academic_qualification?: string | null
          ad_groups?: Json | null
          branch?: string | null
          created_at?: string | null
          date_joining?: string | null
          department?: string | null
          email?: string | null
          employee_id?: string | null
          employee_type?: string | null
          full_name?: string
          function_role?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          manager_id?: string | null
          marital_status?: string | null
          occupied_since?: string | null
          previous_function?: string | null
          second_manager_id?: string | null
          sex?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_second_manager_id_fkey"
            columns: ["second_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: { Args: never; Returns: string }
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
