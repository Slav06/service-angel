CREATE TABLE "dialer_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"rep_id" integer,
	"kind" text NOT NULL,
	"phone" text,
	"name" text,
	"body" text,
	"url" text,
	"seconds" integer,
	"external_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "dialerr_id" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "direction" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "seconds" integer;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "disposition" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "recording_url" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dialerr_email" text;--> statement-breakpoint
ALTER TABLE "dialer_events" ADD CONSTRAINT "dialer_events_rep_id_users_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dialer_events_at_idx" ON "dialer_events" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "dialer_events_external_idx" ON "dialer_events" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calls_dialerr_idx" ON "calls" USING btree ("dialerr_id");