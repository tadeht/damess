ALTER TABLE "users"
ADD COLUMN "password_reset_code_hash" TEXT,
ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);
