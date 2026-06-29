-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_settings" (
    "key"       TEXT         NOT NULL,
    "value"     TEXT         NOT NULL,
    "updatedBy" TEXT         NOT NULL DEFAULT 'system',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- Seed default settings
INSERT INTO "platform_settings" ("key", "value") VALUES
  ('siteName',              'EBooksStore'),
  ('supportEmail',          'suporte@ebooks.co.mz'),
  ('deliveryFee',           '150'),
  ('maxItemsPerOrder',      '10'),
  ('enableSubscriptions',   'true'),
  ('enablePartnerProgram',  'true'),
  ('enablePhysicalBooks',   'true'),
  ('maintenanceMode',       'false')
ON CONFLICT ("key") DO NOTHING;
