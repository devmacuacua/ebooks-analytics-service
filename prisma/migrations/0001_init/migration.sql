-- Read model construído a partir de eventos RabbitMQ

CREATE TABLE "revenue_events" (
    "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
    "orderId"       VARCHAR(255)  NOT NULL,
    "amount"        DECIMAL(10,2) NOT NULL,
    "paymentMethod" VARCHAR(50)   NOT NULL,
    "bookType"      VARCHAR(20)   NOT NULL, -- EBOOK | PHYSICAL
    "currency"      VARCHAR(10)   NOT NULL DEFAULT 'MZN',
    "eventDate"     DATE          NOT NULL,
    "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revenue_events_orderId_key" ON "revenue_events"("orderId");
CREATE INDEX "revenue_events_eventDate_idx"      ON "revenue_events"("eventDate");
CREATE INDEX "revenue_events_paymentMethod_idx"  ON "revenue_events"("paymentMethod");

CREATE TABLE "user_events" (
    "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
    "userId"    VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(50)  NOT NULL, -- registered | login | subscription_created
    "eventDate" DATE         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_events_eventDate_idx"  ON "user_events"("eventDate");
CREATE INDEX "user_events_eventType_idx"  ON "user_events"("eventType");
CREATE INDEX "user_events_userId_idx"     ON "user_events"("userId");

CREATE TABLE "book_events" (
    "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
    "bookId"    VARCHAR(255) NOT NULL,
    "bookTitle" VARCHAR(500) NOT NULL,
    "bookType"  VARCHAR(20)  NOT NULL DEFAULT 'EBOOK',
    "eventType" VARCHAR(50)  NOT NULL, -- purchased | read_session
    "eventDate" DATE         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "book_events_bookId_idx"    ON "book_events"("bookId");
CREATE INDEX "book_events_eventDate_idx" ON "book_events"("eventDate");
CREATE INDEX "book_events_eventType_idx" ON "book_events"("eventType");

CREATE TABLE "subscription_events" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "subscriptionId" VARCHAR(255) NOT NULL,
    "planType"       VARCHAR(20)  NOT NULL, -- MONTHLY | ANNUAL
    "eventType"      VARCHAR(50)  NOT NULL, -- created | cancelled | expired | renewed
    "eventDate"      DATE         NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_events_subscriptionId_eventType_key"
    ON "subscription_events"("subscriptionId", "eventType");
CREATE INDEX "subscription_events_eventDate_idx" ON "subscription_events"("eventDate");

CREATE TABLE "delivery_events" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "deliveryId" VARCHAR(255) NOT NULL,
    "province"   VARCHAR(100) NOT NULL,
    "status"     VARCHAR(50)  NOT NULL,
    "eventDate"  DATE         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_events_eventDate_idx" ON "delivery_events"("eventDate");
CREATE INDEX "delivery_events_status_idx"    ON "delivery_events"("status");

-- Snapshot diário pré-agregado (actualizado pelo cron)
CREATE TABLE "daily_snapshots" (
    "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    "snapshotDate"        DATE          NOT NULL,
    "totalRevenue"        DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOrders"         INTEGER       NOT NULL DEFAULT 0,
    "newUsers"            INTEGER       NOT NULL DEFAULT 0,
    "activeSubscriptions" INTEGER       NOT NULL DEFAULT 0,
    "newSubscriptions"    INTEGER       NOT NULL DEFAULT 0,
    "pendingDeliveries"   INTEGER       NOT NULL DEFAULT 0,
    "completedDeliveries" INTEGER       NOT NULL DEFAULT 0,
    "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_snapshots_snapshotDate_key" ON "daily_snapshots"("snapshotDate");
