-- 001_enums.sql
-- Create ENUM types used across the schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
END$$;

-- Subscription status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active','inactive','cancelled','past_due','expired');
  END IF;
END$$;

-- Subscription plan
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('monthly','yearly');
  END IF;
END$$;

-- Draw mode
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draw_mode') THEN
    CREATE TYPE draw_mode AS ENUM ('random','algorithmic');
  END IF;
END$$;

-- Draw status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draw_status') THEN
    CREATE TYPE draw_status AS ENUM ('draft','simulated','published','completed');
  END IF;
END$$;

-- Winner status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'winner_status') THEN
    CREATE TYPE winner_status AS ENUM ('pending','approved','rejected');
  END IF;
END$$;

-- Payout status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM ('pending','processing','paid');
  END IF;
END$$;
