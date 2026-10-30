-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "accessTokenExpiresAt" DROP NOT NULL,
ALTER COLUMN "refreshTokenExpiresAt" DROP NOT NULL;
