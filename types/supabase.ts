export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      reactions: {
        Row: {
          id: string
          created_at: string
          transaction_id: string
          user_id: string
          emoji: string
        }
        Insert: {
          id?: string
          created_at?: string
          transaction_id: string
          user_id: string
          emoji: string
        }
        Update: {
          id?: string
          created_at?: string
          transaction_id?: string
          user_id?: string
          emoji?: string
        }
      }
      transactions: {
        Row: {
          id: string
          created_at: string
          title: string
          amount: number
          type: string
          paid_by: string
          split_between: string[]
          note?: string
          tag?: string
          group_id?: string
          category_id?: string
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          amount: number
          type: string
          paid_by: string
          split_between: string[]
          note?: string
          tag?: string
          group_id?: string
          category_id?: string
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          amount?: number
          type?: string
          paid_by?: string
          split_between?: string[]
          note?: string
          tag?: string
          group_id?: string
          category_id?: string
          created_by?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url?: string
          default_currency?: string
          updated_at?: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string
          default_currency?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string
          default_currency?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description?: string
          emoji: string
          color?: string
          currency: string
          created_at: string
          created_by: string
          is_personal?: boolean
          updated_at?: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          emoji: string
          color?: string
          currency: string
          created_at?: string
          created_by: string
          is_personal?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          emoji?: string
          color?: string
          currency?: string
          created_at?: string
          created_by?: string
          is_personal?: boolean
          updated_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          user_id: string
          group_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string
          role?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 