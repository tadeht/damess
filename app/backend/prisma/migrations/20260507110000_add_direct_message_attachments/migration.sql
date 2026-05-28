ALTER TABLE "direct_messages"
ADD COLUMN "attachment_type" TEXT,
ADD COLUMN "attachment_name" TEXT,
ADD COLUMN "attachment_mime" TEXT,
ADD COLUMN "attachment_data" TEXT;
