-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "type" "RoomType" NOT NULL DEFAULT 'PUBLIC';
