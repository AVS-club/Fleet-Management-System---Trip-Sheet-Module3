/*
  # Add Insurance and Tax Fields to Vehicles Table

  1. New Table
    - `admin_insurers` - Stores list of insurance companies
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. New Columns
    - `insurance_idv` (numeric) - Insured Declared Value for insurance
    - `tax_scope` (text) - Scope of tax (State/National)

  3. Security
    - Enable RLS on `admin_insurers` table
    - Add policies for authenticated users
*/

-- Create admin_insurers table
CREATE TABLE IF NOT EXISTS admin_insurers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS insurance_idv numeric,
ADD COLUMN IF NOT EXISTS tax_scope text;

-- Enable RLS on admin_insurers
ALTER TABLE admin_insurers ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_insurers
CREATE POLICY "Enable read access for authenticated users" ON admin_insurers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for admin users" ON admin_insurers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for admin users" ON admin_insurers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Add some default insurers
INSERT INTO admin_insurers (name) VALUES
  ('ICICI Lombard'),
  ('Bajaj Allianz'),
  ('HDFC ERGO'),
  ('New India Assurance'),
  ('Tata AIG'),
  ('Reliance General Insurance'),
  ('National Insurance Company'),
  ('Oriental Insurance'),
  ('United India Insurance'),
  ('SBI General Insurance')
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER set_timestamp_admin_insurers
BEFORE UPDATE ON admin_insurers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();