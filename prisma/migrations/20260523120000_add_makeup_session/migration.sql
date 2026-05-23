-- Migration: add_makeup_session
-- Thêm bảng makeup_sessions để quản lý học viên học bù ở lớp khác
-- Không ảnh hưởng đến bảng attendances lớp gốc

-- CreateEnum
CREATE TYPE "MakeupAttendance" AS ENUM ('scheduled', 'attended', 'absent');

-- CreateTable
CREATE TABLE "makeup_sessions" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "makeup_session_id" TEXT NOT NULL,
    "original_session_id" TEXT NOT NULL,
    "registered_by_id" TEXT NOT NULL,
    "attendance_status" "MakeupAttendance" NOT NULL DEFAULT 'scheduled',
    "note" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "makeup_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "makeup_sessions_enrollment_id_idx" ON "makeup_sessions"("enrollment_id");

-- CreateIndex
CREATE INDEX "makeup_sessions_makeup_session_id_idx" ON "makeup_sessions"("makeup_session_id");

-- CreateIndex
CREATE INDEX "makeup_sessions_original_session_id_idx" ON "makeup_sessions"("original_session_id");

-- CreateIndex
CREATE INDEX "makeup_sessions_deleted_at_idx" ON "makeup_sessions"("deleted_at");

-- AddForeignKey
ALTER TABLE "makeup_sessions" ADD CONSTRAINT "makeup_sessions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "makeup_sessions" ADD CONSTRAINT "makeup_sessions_makeup_session_id_fkey" FOREIGN KEY ("makeup_session_id") REFERENCES "class_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "makeup_sessions" ADD CONSTRAINT "makeup_sessions_original_session_id_fkey" FOREIGN KEY ("original_session_id") REFERENCES "class_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "makeup_sessions" ADD CONSTRAINT "makeup_sessions_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
