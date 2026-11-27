-- CreateTable
CREATE TABLE "workers" (
    "id" UUID NOT NULL,
    "cooperativeId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "joiningDate" DATE NOT NULL,
    "profileStatus" TEXT NOT NULL,
    "accountStatus" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL,
    "availabilityStartTime" TIME(6),
    "availabilityEndTime" TIME(6),
    "requestedAt" TIMESTAMP(6) NOT NULL,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(6),
    "rejectionReason" TEXT,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_qualifications" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "qualificationName" TEXT NOT NULL,
    "documentUrl" TEXT,
    "verificationStatus" TEXT NOT NULL,

    CONSTRAINT "worker_qualifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "worker_qualifications" ADD CONSTRAINT "worker_qualifications_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
