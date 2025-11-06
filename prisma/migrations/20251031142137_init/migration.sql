-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "assignedSeller" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "transcription" TEXT NOT NULL,
    "industry" TEXT,
    "operationSize" TEXT,
    "interactionVolume" INTEGER,
    "discoverySource" TEXT,
    "mainMotivation" TEXT,
    "urgencyLevel" TEXT,
    "painPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technicalRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentiment" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_batches" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalClients" INTEGER NOT NULL,
    "processedClients" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "processing_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_logs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_assignedSeller_idx" ON "clients"("assignedSeller");

-- CreateIndex
CREATE INDEX "clients_industry_idx" ON "clients"("industry");

-- CreateIndex
CREATE INDEX "clients_closed_idx" ON "clients"("closed");

-- CreateIndex
CREATE INDEX "clients_meetingDate_idx" ON "clients"("meetingDate");

-- CreateIndex
CREATE INDEX "analysis_logs_clientId_idx" ON "analysis_logs"("clientId");
