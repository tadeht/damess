ALTER TABLE "requests" ADD COLUMN "project_id" INTEGER;

ALTER TABLE "requests" ADD CONSTRAINT "requests_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "requests_project_id_idx" ON "requests"("project_id");
