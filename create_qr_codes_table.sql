-- SQL script to create qr_codes table
-- Run this in Supabase SQL Editor

-- Create qr_codes table with proper structure
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id SERIAL PRIMARY KEY,
  dtid TEXT UNIQUE NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on dtid for faster lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_dtid ON public.qr_codes(dtid);

-- Add helpful comment
COMMENT ON TABLE public.qr_codes IS 'Stores QR code information for tourist DTIDs';

-- Allow public access (disable RLS or create policy)
ALTER TABLE public.qr_codes DISABLE ROW LEVEL SECURITY;

-- Alternatively, you can use a policy instead
-- CREATE POLICY "Allow anonymous access" ON public.qr_codes FOR ALL USING (true);

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'qr_codes'
ORDER BY 
  ordinal_position;