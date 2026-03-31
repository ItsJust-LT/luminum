-- CreateTable
CREATE TABLE "organization_role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120),
    "color" VARCHAR(32) NOT NULL DEFAULT '#64748b',
    "iconKey" VARCHAR(64) NOT NULL DEFAULT 'User',
    "kind" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organization_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_role_permission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permission" VARCHAR(128) NOT NULL,

    CONSTRAINT "organization_role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_organization_role_organization_id" ON "organization_role"("organizationId");

-- CreateIndex
CREATE INDEX "idx_organization_role_org_kind" ON "organization_role"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "uq_organization_role_permission" ON "organization_role_permission"("roleId", "permission");

-- CreateIndex
CREATE INDEX "idx_organization_role_permission_role_id" ON "organization_role_permission"("roleId");

-- AddForeignKey
ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_permission" ADD CONSTRAINT "organization_role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "organization_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "member" ADD COLUMN "organizationRoleId" TEXT;

-- AlterTable
ALTER TABLE "invitation" ADD COLUMN "organizationRoleId" TEXT;

-- CreateIndex
CREATE INDEX "idx_member_organization_role_id" ON "member"("organizationRoleId");

-- CreateIndex
CREATE INDEX "idx_invitation_organization_role_id" ON "invitation"("organizationRoleId");

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationRoleId_fkey" FOREIGN KEY ("organizationRoleId") REFERENCES "organization_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationRoleId_fkey" FOREIGN KEY ("organizationRoleId") REFERENCES "organization_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
