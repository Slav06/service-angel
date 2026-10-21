CREATE TABLE "finder_places" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"phone" text,
	"name" text NOT NULL,
	"country" text,
	"lead_id" integer,
	"rep_id" integer,
	"request_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_requests" ADD COLUMN "finder_status" text;--> statement-breakpoint
ALTER TABLE "lead_requests" ADD COLUMN "finder_rounds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_requests" ADD COLUMN "finder_scanned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_requests" ADD COLUMN "finder_queries" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_requests" ADD COLUMN "finder_error" text;--> statement-breakpoint
ALTER TABLE "lead_requests" ADD COLUMN "finder_beat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "maps_url" text;--> statement-breakpoint
ALTER TABLE "finder_places" ADD CONSTRAINT "finder_places_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finder_places" ADD CONSTRAINT "finder_places_rep_id_users_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finder_places" ADD CONSTRAINT "finder_places_request_id_lead_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."lead_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "finder_places_place_idx" ON "finder_places" USING btree ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "finder_places_phone_idx" ON "finder_places" USING btree ("phone");