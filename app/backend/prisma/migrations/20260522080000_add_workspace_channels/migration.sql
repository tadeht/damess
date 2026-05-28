-- CreateTable
CREATE TABLE "workspace_channels" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_messages" (
    "id" SERIAL NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_type" TEXT,
    "attachment_name" TEXT,
    "attachment_mime" TEXT,
    "attachment_data" TEXT,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_message_reads" (
    "id" SERIAL NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "last_read_message_id" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_channels_workspace_id_sort_order_idx" ON "workspace_channels"("workspace_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_channels_workspace_id_name_key" ON "workspace_channels"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "workspace_messages_channel_id_created_at_idx" ON "workspace_messages"("channel_id", "created_at");

-- CreateIndex
CREATE INDEX "workspace_messages_sender_id_idx" ON "workspace_messages"("sender_id");

-- CreateIndex
CREATE INDEX "workspace_message_reads_user_id_idx" ON "workspace_message_reads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_message_reads_channel_id_user_id_key" ON "workspace_message_reads"("channel_id", "user_id");

-- AddForeignKey
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "workspace_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_message_reads" ADD CONSTRAINT "workspace_message_reads_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "workspace_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_message_reads" ADD CONSTRAINT "workspace_message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
