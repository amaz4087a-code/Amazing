-- ============================================================
-- SPROTS - Database Schema for PostgreSQL (Supabase)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "phone" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable: Account
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateTable: Session
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateTable: VerificationToken
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateTable: Course
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "thumbnail" TEXT,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: Enrollment
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Enrollment_studentId_courseId_key" ON "Enrollment"("studentId", "courseId");

-- CreateTable: StandardMotion
CREATE TABLE "StandardMotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER',
    "duration" DOUBLE PRECISION NOT NULL,
    "frameCount" INTEGER NOT NULL,
    "jointsCount" INTEGER NOT NULL,
    "jointNames" TEXT NOT NULL,
    "fps" INTEGER NOT NULL DEFAULT 30,
    "fileUrl" TEXT,
    "thumbnailUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "relevantBodyParts" TEXT,
    "courseId" TEXT,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "StandardMotion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "StandardMotion_category_idx" ON "StandardMotion"("category");
CREATE INDEX "StandardMotion_teacherId_idx" ON "StandardMotion"("teacherId");

-- CreateTable: StandardMotionFrame
CREATE TABLE "StandardMotionFrame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standardMotionId" TEXT NOT NULL,
    "frameIndex" INTEGER NOT NULL,
    "timestamp" DOUBLE PRECISION NOT NULL,
    "joints" TEXT NOT NULL,
    CONSTRAINT "StandardMotionFrame_standardMotionId_fkey" FOREIGN KEY ("standardMotionId") REFERENCES "StandardMotion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StandardMotionFrame_standardMotionId_frameIndex_idx" ON "StandardMotionFrame"("standardMotionId", "frameIndex");

-- CreateTable: AssessmentSession
CREATE TABLE "AssessmentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "studentId" TEXT NOT NULL,
    "standardMotionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ,
    "duration" DOUBLE PRECISION,
    "selectedBodyParts" TEXT,
    "scoringRatios" TEXT,
    "rhythmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoCaptureEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configNotes" TEXT,
    CONSTRAINT "AssessmentSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssessmentSession_standardMotionId_fkey" FOREIGN KEY ("standardMotionId") REFERENCES "StandardMotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AssessmentSession_studentId_idx" ON "AssessmentSession"("studentId");
CREATE INDEX "AssessmentSession_standardMotionId_idx" ON "AssessmentSession"("standardMotionId");
CREATE INDEX "AssessmentSession_status_idx" ON "AssessmentSession"("status");

-- CreateTable: UserMotionFrame
CREATE TABLE "UserMotionFrame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "frameIndex" INTEGER NOT NULL,
    "timestamp" DOUBLE PRECISION NOT NULL,
    "deviceInfo" TEXT,
    "joints" TEXT NOT NULL,
    CONSTRAINT "UserMotionFrame_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserMotionFrame_sessionId_frameIndex_idx" ON "UserMotionFrame"("sessionId", "frameIndex");

-- CreateTable: AssessmentResult
CREATE TABLE "AssessmentResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "accuracyScore" DOUBLE PRECISION NOT NULL,
    "rhythmScore" DOUBLE PRECISION NOT NULL,
    "fluidityScore" DOUBLE PRECISION NOT NULL,
    "explosivenessScore" DOUBLE PRECISION NOT NULL,
    "extensionScore" DOUBLE PRECISION NOT NULL,
    "symmetryScore" DOUBLE PRECISION NOT NULL,
    "stabilityScore" DOUBLE PRECISION NOT NULL,
    "coordinationScore" DOUBLE PRECISION NOT NULL,
    "syncRateScore" DOUBLE PRECISION NOT NULL,
    "rangeOfMotionScore" DOUBLE PRECISION NOT NULL,
    "completenessScore" DOUBLE PRECISION NOT NULL,
    "jointDeviations" TEXT NOT NULL,
    "temporalDeviations" TEXT NOT NULL,
    "frameScores" TEXT NOT NULL,
    "feedbackItems" TEXT NOT NULL,
    "trainingSuggestions" TEXT NOT NULL,
    "indicatorWeights" TEXT NOT NULL,
    "analysisDurationMs" INTEGER NOT NULL,
    "scoringVersion" TEXT NOT NULL DEFAULT '1.0.0',
    CONSTRAINT "AssessmentResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssessmentResult_sessionId_key" ON "AssessmentResult"("sessionId");

-- CreateTable: Report
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assessmentId" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "templateId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Report_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Report_assessmentId_idx" ON "Report"("assessmentId");

-- CreateTable: SystemConfig
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");
