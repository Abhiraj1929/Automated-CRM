// ============================================================
// Database Types - Auto-generated or manual Supabase types
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          title: string;
          name: string;
          email: string;
          phone: string | null;
          company: string | null;
          amount: number;
          status: string;
          lead_score: number;
          score_category: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
          tags: string[] | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          name: string;
          email: string;
          phone?: string | null;
          company?: string | null;
          amount: number;
          status?: string;
          lead_score?: number;
          score_category?: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          tags?: string[] | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          company?: string | null;
          amount?: number;
          status?: string;
          lead_score?: number;
          score_category?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          tags?: string[] | null;
          notes?: string | null;
        };
      };
      contacts: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          company: string | null;
          position: string | null;
          avatar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          company?: string | null;
          position?: string | null;
          avatar?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          company?: string | null;
          position?: string | null;
          avatar?: string | null;
          created_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          type: string;
          description: string;
          lead_id: string | null;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          description: string;
          lead_id?: string | null;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          description?: string;
          lead_id?: string | null;
          user_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      lead_status: "new" | "contacted" | "proposal_sent" | "won" | "lost";
    };
  };
}
