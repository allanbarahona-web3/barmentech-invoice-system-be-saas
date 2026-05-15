-- CreateEnum
CREATE TYPE "FiscalDocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'READY_TO_SUBMIT', 'SUBMITTED', 'PROCESSING', 'ACCEPTED', 'REJECTED', 'ERROR', 'CANCELLED');

-- CreateTable
CREATE TABLE "fiscal_documents" (
    "id" TEXT NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "order_id" TEXT,
    "source_document_id" TEXT,
    "document_type" TEXT NOT NULL,
    "country_code" TEXT,
    "country_pack" TEXT,
    "fiscal_number" TEXT,
    "commercial_reference" TEXT,
    "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" INTEGER NOT NULL,
    "tax_total" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "payload_snapshot" JSONB,
    "provider_response" JSONB,
    "xml_path" TEXT,
    "pdf_path" TEXT,
    "signed_xml_path" TEXT,
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),

    CONSTRAINT "fiscal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiscal_documents_tenantId_idx" ON "fiscal_documents"("tenantId");

-- CreateIndex
CREATE INDEX "fiscal_documents_order_id_idx" ON "fiscal_documents"("order_id");

-- CreateIndex
CREATE INDEX "fiscal_documents_status_idx" ON "fiscal_documents"("status");

-- CreateIndex
CREATE INDEX "fiscal_documents_createdAt_idx" ON "fiscal_documents"("createdAt");

-- CreateIndex
CREATE INDEX "fiscal_documents_tenantId_fiscal_number_idx" ON "fiscal_documents"("tenantId", "fiscal_number");

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS hardening for fiscal documents
ALTER TABLE "fiscal_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fiscal_documents" FORCE ROW LEVEL SECURITY;

CREATE POLICY fiscal_documents_all_isolation ON "fiscal_documents"
    FOR ALL
    USING ("tenantId" = current_setting('app.tenant_id', true)::int)
    WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);
