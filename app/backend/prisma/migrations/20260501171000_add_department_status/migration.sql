ALTER TABLE "departments"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT';

UPDATE "departments"
SET "status" = CASE WHEN "is_active" = TRUE THEN 'ACTIVE' ELSE 'SUSPENDED' END;
