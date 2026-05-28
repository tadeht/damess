ALTER TABLE "projects" ADD COLUMN "start_date" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "due_date" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "closed_at" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "closed_reason" TEXT;
ALTER TABLE "projects" ADD COLUMN "extended_at" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "extension_reason" TEXT;

CREATE TABLE "project_work_items" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'TASK',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assigned_to_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_work_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_work_items_project_id_status_idx" ON "project_work_items"("project_id", "status");
CREATE INDEX "project_work_items_parent_id_idx" ON "project_work_items"("parent_id");
CREATE INDEX "project_work_items_assigned_to_id_idx" ON "project_work_items"("assigned_to_id");

ALTER TABLE "project_work_items" ADD CONSTRAINT "project_work_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_work_items" ADD CONSTRAINT "project_work_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_work_items" ADD CONSTRAINT "project_work_items_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_work_items" ADD CONSTRAINT "project_work_items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
