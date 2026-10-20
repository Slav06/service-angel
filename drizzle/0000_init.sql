CREATE TABLE "auth_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"ip" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"rep_id" integer NOT NULL,
	"lead_id" integer,
	"outcome" text NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"rep_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"niche" text,
	"area" text,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"business" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"website" text,
	"city" text,
	"niche" text,
	"message" text,
	"source" text DEFAULT 'import' NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"rep_id" integer,
	"request_id" integer,
	"notes" text,
	"next_follow_up_at" timestamp with time zone,
	"assigned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"price_cents" integer NOT NULL,
	"monthly_cents" integer DEFAULT 0 NOT NULL,
	"build_cost_cents" integer DEFAULT 0 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"rep_id" integer NOT NULL,
	"lead_id" integer,
	"package_id" integer,
	"client_name" text NOT NULL,
	"package_name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"monthly_cents" integer DEFAULT 0 NOT NULL,
	"build_cost_cents" integer DEFAULT 0 NOT NULL,
	"commission_pct" numeric(5, 2) NOT NULL,
	"commission_cents" integer NOT NULL,
	"collected_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"commission_paid_at" timestamp with time zone,
	"notes" text,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'rep' NOT NULL,
	"key_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"self_registered" boolean DEFAULT false NOT NULL,
	"commission_pct" numeric(5, 2) DEFAULT 20 NOT NULL,
	"monthly_goal_cents" integer DEFAULT 1000000 NOT NULL,
	"daily_call_goal" integer DEFAULT 60 NOT NULL,
	"phone" text,
	"email" text,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_rep_id_users_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_requests" ADD CONSTRAINT "lead_requests_rep_id_users_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_rep_id_users_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_rep_id_users_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_attempts_at_idx" ON "auth_attempts" USING btree ("at");--> statement-breakpoint
CREATE INDEX "calls_rep_at_idx" ON "calls" USING btree ("rep_id","at");--> statement-breakpoint
CREATE INDEX "calls_lead_idx" ON "calls" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_requests_status_idx" ON "lead_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "leads_rep_idx" ON "leads" USING btree ("rep_id","stage");--> statement-breakpoint
CREATE INDEX "leads_unassigned_idx" ON "leads" USING btree ("rep_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_rep_closed_idx" ON "sales" USING btree ("rep_id","closed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_name_lower_idx" ON "users" USING btree (lower("name"));