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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string | null
          agency: string | null
          balance: number
          bank: string | null
          created_at: string
          entity_id: string
          id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          agency?: string | null
          balance?: number
          bank?: string | null
          created_at?: string
          entity_id: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          agency?: string | null
          balance?: number
          bank?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          after_json: Json | null
          before_json: Json
          created_at: string
          id: string
          reason: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          after_json?: Json | null
          before_json: Json
          created_at?: string
          id?: string
          reason: string
          transaction_id: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          after_json?: Json | null
          before_json?: Json
          created_at?: string
          id?: string
          reason?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["entity_type"]
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["entity_type"]
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["entity_type"]
        }
        Relationships: []
      }
      merchants: {
        Row: {
          active: boolean
          balance: number
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["merchant_mode"]
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          balance?: number
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["merchant_mode"]
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          balance?: number
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["merchant_mode"]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          capital_custeio: Database["public"]["Enums"]["capital_custeio"] | null
          created_at: string
          created_by: string
          description: string | null
          destination_account_id: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          edited_reason: string | null
          entity_id: string | null
          id: string
          merchant_id: string | null
          module: Database["public"]["Enums"]["transaction_module"]
          notes: string | null
          origin_fund: Database["public"]["Enums"]["fund_origin"] | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          shift: Database["public"]["Enums"]["shift_type"] | null
          source_account_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          capital_custeio?:
          | Database["public"]["Enums"]["capital_custeio"]
          | null
          created_at?: string
          created_by: string
          description?: string | null
          destination_account_id?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          edited_reason?: string | null
          entity_id?: string | null
          id?: string
          merchant_id?: string | null
          module: Database["public"]["Enums"]["transaction_module"]
          notes?: string | null
          origin_fund?: Database["public"]["Enums"]["fund_origin"] | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          shift?: Database["public"]["Enums"]["shift_type"] | null
          source_account_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          capital_custeio?:
          | Database["public"]["Enums"]["capital_custeio"]
          | null
          created_at?: string
          created_by?: string
          description?: string | null
          destination_account_id?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          edited_reason?: string | null
          entity_id?: string | null
          id?: string
          merchant_id?: string | null
          module?: Database["public"]["Enums"]["transaction_module"]
          notes?: string | null
          origin_fund?: Database["public"]["Enums"]["fund_origin"] | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          shift?: Database["public"]["Enums"]["shift_type"] | null
          source_account_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
      get_dashboard_summary: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "bank" | "cash" | "cash_reserve" | "virtual"
      app_role: "admin" | "user"
      audit_action: "edit" | "void"
      capital_custeio: "capital" | "custeio"
      entity_type: "associacao" | "ue" | "cx"
      fund_origin: "UE" | "CX"
      merchant_mode: "saldo"
      payment_method: "cash" | "pix"
      shift_type: "matutino" | "vespertino"
      transaction_direction: "in" | "out" | "transfer"
      transaction_module:
      | "mensalidade"
      | "gasto_associacao"
      | "bolsinha_transfer"
      | "bolsinha_deposito_pix"
      | "bolsinha_ajuste"
      | "reserva_ajuste"
      | "aporte_saldo"
      | "consumo_saldo"
      | "pix_direto_uecx"
      | "pix_direto_uecx"
      transaction_status: "posted" | "voided"
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
      account_type: ["bank", "cash", "cash_reserve", "virtual"],
      app_role: ["admin", "user"],
      audit_action: ["edit", "void"],
      capital_custeio: ["capital", "custeio"],
      entity_type: ["associacao", "ue", "cx"],
      fund_origin: ["UE", "CX"],
      merchant_mode: ["saldo"],
      payment_method: ["cash", "pix"],
      shift_type: ["matutino", "vespertino"],
      transaction_direction: ["in", "out", "transfer"],
      transaction_module: [
        "mensalidade",
        "gasto_associacao",
        "bolsinha_transfer",
        "bolsinha_deposito_pix",
        "bolsinha_ajuste",
        "reserva_ajuste",
        "aporte_saldo",
        "consumo_saldo",
        "pix_direto_uecx",
        "pix_direto_uecx",
      ],
      transaction_status: ["posted", "voided"],
    },
  },
} as const
