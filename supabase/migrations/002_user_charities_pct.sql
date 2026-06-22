-- Add contribution percentage to user_charities
ALTER TABLE user_charities
  ADD COLUMN IF NOT EXISTS contribution_percentage int NOT NULL DEFAULT 10;
