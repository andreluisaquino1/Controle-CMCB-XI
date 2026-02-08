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
          active: boolean
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
          active?: boolean
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
          active?: boolean
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
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          after_json?: Json | null
          before_json: Json
          created_at?: string
          id?: string
          reason: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          after_json?: Json | null
          before_json?: Json
          created_at?: string
          id?: string
          reason?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      ledger_audit_log: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: number
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: number
        }
        Relationships: []
      }
      ledger_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string
          description: string | null
          destination_account: string | null
          id: string
          metadata: Json
          reference_id: string | null
          source_account: string
          type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by: string
          description?: string | null
          destination_account?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          source_account: string
          type: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string
          description?: string | null
          destination_account?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          source_account?: string
          type?: string
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
          mode?: Database["public"]["Enums"]["merchant_mode"]
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
      transaction_items: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          occurred_at: string | null
          parent_transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          occurred_at?: string | null
          parent_transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          occurred_at?: string | null
          parent_transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_modules_config: {
        Row: {
          category: string
          created_at: string | null
          is_active: boolean | null
          label: string
          module_key: Database["public"]["Enums"]["transaction_module"]
        }
        Insert: {
          category: string
          created_at?: string | null
          is_active?: boolean | null
          label: string
          module_key: Database["public"]["Enums"]["transaction_module"]
        }
        Update: {
          category?: string
          created_at?: string | null
          is_active?: boolean | null
          label?: string
          module_key?: Database["public"]["Enums"]["transaction_module"]
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          capital_custeio: Database["public"]["Enums"]["capital_custeio"] | null
          created_at: string
          created_by: string | null
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
          parent_transaction_id: string | null
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
          created_by?: string | null
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
          parent_transaction_id?: string | null
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
          created_by?: string | null
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
          parent_transaction_id?: string | null
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
            foreignKeyName: "transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      user_profiles: {
        Row: {
          created_at: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
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
      ledger_balances: {
        Row: {
          account_id: string | null
          account_key: string | null
          balance: number | null
          balance_cents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_demo_role: { Args: { target_email: string }; Returns: string }
      check_is_admin_or_tesouraria: { Args: never; Returns: boolean }
      danger_reset_ledger: { Args: never; Returns: undefined }
      get_current_balances: { Args: never; Returns: Json }
      get_current_user_role: { Args: never; Returns: string }
      get_dashboard_summary: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_primary_account: {
        Args: {
          p_entity: string
          p_type: Database["public"]["Enums"]["account_type"]
        }
        Returns: string
      }
      get_report_summary:
      | { Args: { p_end_date: string; p_start_date: string }; Returns: Json }
      | {
        Args: {
          p_end_date: string
          p_entity_id: string
          p_start_date: string
        }
        Returns: Json
      }
      get_transaction_items: {
        Args: { p_parent_transaction_id: string }
        Returns: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          occurred_at: string | null
          parent_transaction_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transaction_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      process_pix_fee_batch: {
        Args: { p_entity_id: string; p_payload: Json }
        Returns: string
      }
      process_resource_transaction: { Args: { p_tx: Json }; Returns: Json }
      process_transaction: { Args: { p_tx: Json }; Returns: Json }
      void_transaction: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
    }
    Enums: {
      account_type: "bank" | "cash" | "cash_reserve" | "virtual"
      app_role: "admin" | "user" | "demo"
      audit_action: "create" | "edit" | "void" | "change"
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
      | "assoc_transfer"
      | "especie_transfer"
      | "especie_deposito_pix"
      | "especie_ajuste"
      | "pix_ajuste"
      | "cofre_ajuste"
      | "conta_digital_transfer"
      | "conta_digital_taxa"
      | "conta_digital_ajuste"
      | "aporte_saldo"
      | "consumo_saldo"
      | "pix_direto_uecx"
      | "recurso_transfer"
      | "aporte_estabelecimento_recurso"
      | "mensalidade_pix"
      | "pix_nao_identificado"
      | "taxa_pix_bb"
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
      app_role: ["admin", "user", "demo"],
      audit_action: ["create", "edit", "void", "change"],
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
        "assoc_transfer",
        "especie_transfer",
        "especie_deposito_pix",
        "especie_ajuste",
        "pix_ajuste",
        "cofre_ajuste",
        "conta_digital_transfer",
        "conta_digital_taxa",
        "conta_digital_ajuste",
        "aporte_saldo",
        "consumo_saldo",
        "pix_direto_uecx",
        "recurso_transfer",
        "aporte_estabelecimento_recurso",
        "mensalidade_pix",
        "pix_nao_identificado",
        "taxa_pix_bb",
      ],
      transaction_status: ["posted", "voided"],
    },
  },
} as const
