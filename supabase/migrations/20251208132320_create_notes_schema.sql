/*
  # PenSilc Database Schema

  ## Overview
  Complete database schema for the PenSilc application with subjects, notes, and sharing functionality.

  ## New Tables
  
  ### `subjects`
  Stores subjects created by users for organizing their notes.
  - `id` (uuid, primary key) - Unique identifier for the subject
  - `user_id` (uuid, foreign key) - References auth.users, owner of the subject
  - `name` (text) - Name of the subject
  - `created_at` (timestamptz) - When the subject was created
  - `updated_at` (timestamptz) - Last update timestamp

  ### `notes`
  Stores individual note files within subjects.
  - `id` (uuid, primary key) - Unique identifier for the note
  - `subject_id` (uuid, foreign key) - References subjects table
  - `user_id` (uuid, foreign key) - References auth.users, owner of the note
  - `title` (text) - Title/name of the note file
  - `content` (jsonb) - Canvas data stored as JSON (shapes, drawings, text)
  - `thumbnail` (text, nullable) - Optional thumbnail URL for preview
  - `created_at` (timestamptz) - When the note was created
  - `updated_at` (timestamptz) - Last edit timestamp

  ### `shared_notes`
  Manages shareable links for notes with view-only access.
  - `id` (uuid, primary key) - Unique identifier / shareable ID
  - `note_id` (uuid, foreign key) - References notes table
  - `created_at` (timestamptz) - When the share link was created
  - `expires_at` (timestamptz, nullable) - Optional expiration date

  ## Security
  - All tables have RLS (Row Level Security) enabled
  - Users can only access their own subjects and notes
  - Shared notes are publicly viewable via share link but read-only
  - Only authenticated users can create/edit content

  ## Indexes
  - Foreign key indexes for performance
  - User ID indexes for efficient queries
*/

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb DEFAULT '{"objects": [], "background": "#ffffff"}'::jsonb,
  thumbnail text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shared_notes table
CREATE TABLE IF NOT EXISTS shared_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_note_id ON shared_notes(note_id);

-- Enable Row Level Security
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subjects table
CREATE POLICY "Users can view own subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subjects"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects"
  ON subjects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects"
  ON subjects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for notes table
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for shared_notes table
CREATE POLICY "Anyone can view shared notes via share link"
  ON shared_notes FOR SELECT
  TO anon, authenticated
  USING (
    expires_at IS NULL OR expires_at > now()
  );

CREATE POLICY "Note owners can create share links"
  ON shared_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Note owners can delete share links"
  ON shared_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();