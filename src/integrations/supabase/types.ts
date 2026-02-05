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
          active: boolean
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
          active?: boolean
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
          active?: boolean
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
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["entity_type"]
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["entity_type"]
        }
        Update: {
          cnpj?: string | null
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
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          balance?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          balance?: number
          created_at?: string
          id?: string
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
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          destination_account_id: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
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
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description?: string | null
          destination_account_id?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
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
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          destination_account_id?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
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
        }
        Relationships: [
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_balances: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_dashboard_summary: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: Json
      }
      get_report_summary: {
        Args: {
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      is_active_user: {
        Args: {
          user_email: string
        }
        Returns: boolean
      }
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
      | "especie_transfer"
      | "especie_deposito_pix"
      | "especie_ajuste"
      | "cofre_ajuste"
      | "conta_digital_ajuste"
      | "conta_digital_taxa"
      | "aporte_saldo"
      | "consumo_saldo"
      | "pix_direto_uecx"
      | "aporte_estabelecimento_recurso"
      transaction_status: "posted" | "voided"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
