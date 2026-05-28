ALTER TABLE "requests"
ADD COLUMN "workspace_id" INTEGER,
ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE "requests"
ADD CONSTRAINT "requests_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "requests_workspace_id_idx" ON "requests"("workspace_id");
CREATE INDEX "requests_visibility_idx" ON "requests"("visibility");
