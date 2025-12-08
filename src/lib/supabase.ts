import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          subject_id: string;
          user_id: string;
          title: string;
          content: any;
          thumbnail: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          user_id: string;
          title: string;
          content?: any;
          thumbnail?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          user_id?: string;
          title?: string;
          content?: any;
          thumbnail?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shared_notes: {
        Row: {
          id: string;
          note_id: string;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          note_id: string;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          note_id?: string;
          created_at?: string;
          expires_at?: string | null;
        };
      };
    };
  };
};
