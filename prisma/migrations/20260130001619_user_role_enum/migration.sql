-- CreateEnum only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER', 'USER');
    END IF;
END $$;

-- Migrate existing data only if role is still text type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'role' 
        AND data_type = 'text'
    ) THEN
        UPDATE "public"."User" SET "role" = 'ADMIN' WHERE "role" = 'root';
        UPDATE "public"."User" SET "role" = 'ADMIN' WHERE "role" = 'admin';
        UPDATE "public"."User" SET "role" = 'OPERATOR' WHERE "role" = 'operator';
        UPDATE "public"."User" SET "role" = 'VIEWER' WHERE "role" = 'viewer';
        UPDATE "public"."User" SET "role" = 'USER' WHERE "role" = 'user';
        UPDATE "public"."User" SET "role" = 'USER' WHERE "role" IS NULL OR "role" NOT IN ('ADMIN', 'OPERATOR', 'VIEWER', 'USER');
        
        -- AlterTable: convert column type using the migrated values
        ALTER TABLE "public"."User"
          ALTER COLUMN "role" SET DEFAULT 'USER',
          ALTER COLUMN "role" SET NOT NULL,
          ALTER COLUMN "role" TYPE "public"."UserRole" USING "role"::"public"."UserRole";
    END IF;
END $$;

-- CreateIndex only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'User_role_idx'
    ) THEN
        CREATE INDEX "User_role_idx" ON "public"."User"("role");
    END IF;
END $$;
