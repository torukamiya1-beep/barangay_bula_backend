-- Migration to remove attempts column from otps table
-- This removes the failed attempts functionality from OTP verification

-- Remove the attempts column from the otps table
ALTER TABLE otps DROP COLUMN IF EXISTS attempts;

-- Verify the column has been removed
DESCRIBE otps;

-- Show success message
SELECT 'Attempts column removed successfully from otps table!' as message;
