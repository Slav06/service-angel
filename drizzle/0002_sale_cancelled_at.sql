ALTER TABLE "sales" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
-- Pricing moved to one monthly plan (2026-10-20). Old packages are hidden, not deleted.
UPDATE "packages" SET "active" = false;--> statement-breakpoint
INSERT INTO "packages" ("name", "tagline", "price_cents", "monthly_cents", "build_cost_cents", "features", "featured", "active", "sort")
VALUES ('Website Plan', 'Everything your business needs online — one simple monthly price.', 0, 50000, 0,
  '["Custom design & copywriting","Mobile-friendly, fast-loading pages","Hosting, SSL security & backups included","Local SEO & Google Business Profile setup","Contact & quote request forms","Monthly content updates","A real person to call for support"]'::jsonb,
  true, true, 0);
