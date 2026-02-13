ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN users.phone_number IS 'Optional user phone number in normalized international format.';
COMMENT ON COLUMN users.date_of_birth IS 'Optional user date of birth.';
