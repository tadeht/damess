CREATE TABLE "workspace_activities" (
  "id" SERIAL NOT NULL,
  "workspace_id" INTEGER NOT NULL,
  "actor_id" INTEGER,
  "target_user_id" INTEGER,
  "action" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workspace_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workspace_activities_workspace_id_created_at_idx" ON "workspace_activities"("workspace_id", "created_at");

ALTER TABLE "workspace_activities" ADD CONSTRAINT "workspace_activities_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_activities" ADD CONSTRAINT "workspace_activities_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workspace_activities" ADD CONSTRAINT "workspace_activities_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
