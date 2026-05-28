CREATE TABLE "request_private_members" (
  "id" SERIAL NOT NULL,
  "request_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "request_private_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "request_private_members_request_id_user_id_key" ON "request_private_members"("request_id", "user_id");
CREATE INDEX "request_private_members_user_id_idx" ON "request_private_members"("user_id");

ALTER TABLE "request_private_members"
ADD CONSTRAINT "request_private_members_request_id_fkey"
FOREIGN KEY ("request_id") REFERENCES "requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "request_private_members"
ADD CONSTRAINT "request_private_members_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
