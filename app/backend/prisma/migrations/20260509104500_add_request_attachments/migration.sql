CREATE TABLE "request_attachments" (
  "id" SERIAL NOT NULL,
  "request_id" INTEGER NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'FILE',
  "name" TEXT NOT NULL,
  "mime" TEXT,
  "data" TEXT NOT NULL,
  "uploaded_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_attachments_request_id_idx" ON "request_attachments"("request_id");

ALTER TABLE "request_attachments"
ADD CONSTRAINT "request_attachments_request_id_fkey"
FOREIGN KEY ("request_id") REFERENCES "requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "request_attachments"
ADD CONSTRAINT "request_attachments_uploaded_by_id_fkey"
FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
