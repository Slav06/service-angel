CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"rep_id" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"for_month" text NOT NULL,
	"kind" text DEFAULT 'monthly' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"commission_paid_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "price_cents" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "monthly_cents" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_rep_id_users_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_rep_paid_idx" ON "payments" USING btree ("rep_id","paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_sale_month_kind_idx" ON "payments" USING btree ("sale_id","for_month","kind");--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "commission_cents";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "collected_cents";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "commission_paid_at";