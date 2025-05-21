-- Modify profiles table to remove default value from default_currency
ALTER TABLE profiles 
  ALTER COLUMN default_currency DROP DEFAULT,
  ALTER COLUMN default_currency DROP NOT NULL;

-- Comment on the column to explain its purpose
COMMENT ON COLUMN profiles.default_currency IS 'The user''s preferred currency (NULL until explicitly set)'; 