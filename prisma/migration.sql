-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "Schedule" (
  "id" TEXT NOT NULL,
  "therapistId" TEXT NOT NULL,
  "dayOfWeek" "DayOfWeek" NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,

  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_therapistId_dayOfWeek_startTime_endTime_key" ON "Schedule"("therapistId", "dayOfWeek", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
