/*
  Warnings:

  - You are about to drop the column `cozeroEntityId` on the `Agency` table. All the data in the column will be lost.
  - You are about to drop the column `inputData` on the `ProcessingStep` table. All the data in the column will be lost.
  - You are about to drop the column `outputData` on the `ProcessingStep` table. All the data in the column will be lost.
  - Added the required column `pipelineType` to the `ProcessingRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pipelineType` to the `Upload` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CozeroPush" ADD COLUMN "cozeroLogId" INTEGER;
ALTER TABLE "CozeroPush" ADD COLUMN "transactionId" TEXT;

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "pipelineType" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "supplierCompany" TEXT,
    "narrative" TEXT,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "transactionDate" TEXT,
    "cognosDescription" TEXT,
    "transactionSubType" TEXT,
    "dbName" TEXT,
    "mccDescription" TEXT,
    "expType" TEXT,
    "description" TEXT,
    "cardholder" TEXT,
    "originalValue" TEXT,
    "originalCurrency" TEXT,
    "service" TEXT,
    "value" REAL,
    "valueUnit" TEXT,
    "hotelCountry" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "pipelineStatus" TEXT NOT NULL DEFAULT 'active',
    "pipelineStep" TEXT,
    "pipelineReason" TEXT,
    "logCategory" TEXT,
    "logSubcategory" TEXT,
    "businessActivity" TEXT,
    "confidence" TEXT,
    "aiReasoning" TEXT,
    "cozeroCategoryId" INTEGER,
    "cozeroSubcategoryId" INTEGER,
    "cozeroActivityId" INTEGER,
    "cozeroSupplierId" INTEGER,
    "locationId" INTEGER,
    "businessUnitId" INTEGER,
    "territoryId" INTEGER,
    "calculationMethodId" INTEGER,
    "unitId" INTEGER,
    "inputKey" TEXT,
    "dataQuality" TEXT DEFAULT 'PRIMARY',
    "readyToUpload" BOOLEAN NOT NULL DEFAULT false,
    "missingIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ProcessingRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cozeroSupplierId" INTEGER,
    "businessActivity" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnmappedSupplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cozeroSupplierId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityTaxonomy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryName" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "subcategoryName" TEXT NOT NULL,
    "subcategoryId" INTEGER NOT NULL,
    "activityName" TEXT NOT NULL,
    "activityId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "AgencyExclusion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "narrativeContains" TEXT,
    "reason" TEXT,
    CONSTRAINT "AgencyExclusion_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalculationMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "cozeroId" INTEGER NOT NULL,
    "label" TEXT
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "cozeroId" INTEGER NOT NULL,
    "label" TEXT
);

-- CreateTable
CREATE TABLE "TerritoryMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryCode" TEXT NOT NULL,
    "cozeroId" INTEGER NOT NULL,
    "countryName" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'United Kingdom',
    "cozeroLocationId" INTEGER,
    "cozeroBusinessUnitId" INTEGER,
    "cozeroTerritoryId" INTEGER,
    "dbNames" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Agency" ("contactEmail", "createdAt", "id", "isActive", "name", "updatedAt") SELECT "contactEmail", "createdAt", "id", "isActive", "name", "updatedAt" FROM "Agency";
DROP TABLE "Agency";
ALTER TABLE "new_Agency" RENAME TO "Agency";
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");
CREATE TABLE "new_ProcessingRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "pipelineType" TEXT NOT NULL,
    "financialYear" TEXT,
    "quarter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputRowCount" INTEGER,
    "excludedCount" INTEGER,
    "categorisedCount" INTEGER,
    "remainingCount" INTEGER,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessingRun_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProcessingRun_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProcessingRun" ("agencyId", "completedAt", "createdAt", "errorMessage", "id", "startedAt", "status", "uploadId") SELECT "agencyId", "completedAt", "createdAt", "errorMessage", "id", "startedAt", "status", "uploadId" FROM "ProcessingRun";
DROP TABLE "ProcessingRun";
ALTER TABLE "new_ProcessingRun" RENAME TO "ProcessingRun";
CREATE TABLE "new_ProcessingStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputCount" INTEGER,
    "outputCount" INTEGER,
    "metadata" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "ProcessingStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ProcessingRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProcessingStep" ("completedAt", "errorMessage", "id", "runId", "startedAt", "status", "stepName", "stepOrder") SELECT "completedAt", "errorMessage", "id", "runId", "startedAt", "status", "stepName", "stepOrder" FROM "ProcessingStep";
DROP TABLE "ProcessingStep";
ALTER TABLE "new_ProcessingStep" RENAME TO "ProcessingStep";
CREATE TABLE "new_Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "pipelineType" TEXT NOT NULL,
    "rowCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "errorMessage" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedData" TEXT,
    CONSTRAINT "Upload_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Upload" ("agencyId", "errorMessage", "fileType", "id", "originalFilename", "parsedData", "rowCount", "status", "storedPath", "uploadedAt") SELECT "agencyId", "errorMessage", "fileType", "id", "originalFilename", "parsedData", "rowCount", "status", "storedPath", "uploadedAt" FROM "Upload";
DROP TABLE "Upload";
ALTER TABLE "new_Upload" RENAME TO "Upload";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Transaction_runId_idx" ON "Transaction"("runId");

-- CreateIndex
CREATE INDEX "Transaction_pipelineStatus_idx" ON "Transaction"("pipelineStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UnmappedSupplier_name_key" ON "UnmappedSupplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityTaxonomy_activityName_key" ON "ActivityTaxonomy"("activityName");

-- CreateIndex
CREATE INDEX "ActivityTaxonomy_activityName_idx" ON "ActivityTaxonomy"("activityName");

-- CreateIndex
CREATE INDEX "AgencyExclusion_agencyId_idx" ON "AgencyExclusion"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "CalculationMethod_key_key" ON "CalculationMethod"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_key_key" ON "Unit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryMapping_countryCode_key" ON "TerritoryMapping"("countryCode");
