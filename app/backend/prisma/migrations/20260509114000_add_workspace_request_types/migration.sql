ALTER TABLE "request_types"
ADD COLUMN "workspace_id" INTEGER;

ALTER TABLE "request_types"
ADD CONSTRAINT "request_types_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "request_types_workspace_id_idx" ON "request_types"("workspace_id");
