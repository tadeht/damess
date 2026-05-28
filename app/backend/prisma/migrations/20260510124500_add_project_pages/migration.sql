CREATE TABLE "project_pages" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" INTEGER NOT NULL,
    "updated_by_id" INTEGER,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_page_revisions" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_page_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_pages_project_id_slug_key" ON "project_pages"("project_id", "slug");
CREATE INDEX "project_pages_project_id_parent_id_idx" ON "project_pages"("project_id", "parent_id");
CREATE UNIQUE INDEX "project_page_revisions_page_id_version_key" ON "project_page_revisions"("page_id", "version");
CREATE INDEX "project_page_revisions_page_id_idx" ON "project_page_revisions"("page_id");

ALTER TABLE "project_pages" ADD CONSTRAINT "project_pages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_pages" ADD CONSTRAINT "project_pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_pages" ADD CONSTRAINT "project_pages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_pages" ADD CONSTRAINT "project_pages_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_page_revisions" ADD CONSTRAINT "project_page_revisions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "project_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_page_revisions" ADD CONSTRAINT "project_page_revisions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
