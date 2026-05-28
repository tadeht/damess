ALTER TABLE "workspaces"
ADD COLUMN "logo_name" TEXT,
ADD COLUMN "logo_mime" TEXT,
ADD COLUMN "logo_data" TEXT,
ADD COLUMN "default_sla_hours" INTEGER,
ADD COLUMN "allow_requester_due_date_override" BOOLEAN NOT NULL DEFAULT true;
