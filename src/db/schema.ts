import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export type Role = 'admin' | 'rep';

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    role: text('role').$type<Role>().notNull().default('rep'),
    keyHash: text('key_hash').notNull(),
    active: boolean('active').notNull().default(true),
    selfRegistered: boolean('self_registered').notNull().default(false),
    // Snapshotted onto each sale when it is logged, so changing it never rewrites history.
    commissionPct: numeric('commission_pct', { precision: 5, scale: 2, mode: 'number' }).notNull().default(20),
    monthlyGoalCents: integer('monthly_goal_cents').notNull().default(1_000_000),
    dailyCallGoal: integer('daily_call_goal').notNull().default(60),
    phone: text('phone'),
    email: text('email'),
    // The rep's agent login in Dialerr; their dialer signs in as this and their Dialerr calls count for them.
    dialerrEmail: text('dialerr_email'),
    lastSeenAt: ts('last_seen_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_name_lower_idx').on(sql`lower(${t.name})`)],
);
export type User = typeof users.$inferSelect;

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// Failed logins and sign-ups, for throttling guesses against short keys.
export const authAttempts = pgTable(
  'auth_attempts',
  {
    id: serial('id').primaryKey(),
    kind: text('kind').$type<'login_fail' | 'register'>().notNull(),
    name: text('name'),
    ip: text('ip'),
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [index('auth_attempts_at_idx').on(t.at)],
);

// The website packages we sell. Price and build cost are copied onto each sale.
export const packages = pgTable('packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  priceCents: integer('price_cents').notNull(),
  monthlyCents: integer('monthly_cents').notNull().default(0),
  buildCostCents: integer('build_cost_cents').notNull().default(0),
  features: jsonb('features').$type<string[]>().notNull().default([]),
  featured: boolean('featured').notNull().default(false),
  active: boolean('active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
});
export type Package = typeof packages.$inferSelect;

export const STAGES = ['new', 'contacted', 'interested', 'proposal', 'won', 'lost'] as const;
export type Stage = (typeof STAGES)[number];

// 'finder': found by the Claude lead finder for a rep's request.
export const LEAD_SOURCES = ['website', 'referral', 'import', 'rep', 'finder'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const leads = pgTable(
  'leads',
  {
    id: serial('id').primaryKey(),
    business: text('business').notNull(),
    contactName: text('contact_name'),
    phone: text('phone'),
    email: text('email'),
    website: text('website'),
    mapsUrl: text('maps_url'), // Google Maps listing (lead finder)
    city: text('city'),
    niche: text('niche'),
    message: text('message'),
    source: text('source').$type<LeadSource>().notNull().default('import'),
    stage: text('stage').$type<Stage>().notNull().default('new'),
    repId: integer('rep_id').references(() => users.id, { onDelete: 'set null' }),
    requestId: integer('request_id'),
    notes: text('notes'),
    nextFollowUpAt: ts('next_follow_up_at'),
    assignedAt: ts('assigned_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('leads_rep_idx').on(t.repId, t.stage), index('leads_unassigned_idx').on(t.repId, t.createdAt)],
);
export type Lead = typeof leads.$inferSelect;

// 'connected' is a Dialerr call that was answered but the rep hasn't said how it went yet.
export const OUTCOMES = ['connected', 'no_answer', 'voicemail', 'gatekeeper', 'not_interested', 'callback', 'interested', 'appointment', 'sold'] as const;
export type Outcome = (typeof OUTCOMES)[number];
// Outcomes where the rep actually spoke with the decision maker.
export const CONVERSATION_OUTCOMES: Outcome[] = ['not_interested', 'callback', 'interested', 'appointment', 'sold'];

export const calls = pgTable(
  'calls',
  {
    id: serial('id').primaryKey(),
    repId: integer('rep_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    leadId: integer('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    outcome: text('outcome').$type<Outcome>().notNull(),
    minutes: integer('minutes').notNull().default(0),
    notes: text('notes'),
    at: ts('at').notNull().defaultNow(),
    // Calls placed through Dialerr are logged automatically; the rest are typed in by the rep.
    source: text('source').$type<'manual' | 'dialerr'>().notNull().default('manual'),
    dialerrId: text('dialerr_id'),
    direction: text('direction').$type<'inbound' | 'outbound'>(),
    phone: text('phone'),
    contactName: text('contact_name'),
    seconds: integer('seconds'),
    disposition: text('disposition'),
    recordingUrl: text('recording_url'),
    aiSummary: text('ai_summary'),
  },
  (t) => [
    index('calls_rep_at_idx').on(t.repId, t.at),
    index('calls_lead_idx').on(t.leadId),
    uniqueIndex('calls_dialerr_idx').on(t.dialerrId),
  ],
);
export type Call = typeof calls.$inferSelect;

// Texts and voicemails from Dialerr (calls go in `calls`).
export const dialerEvents = pgTable(
  'dialer_events',
  {
    id: serial('id').primaryKey(),
    repId: integer('rep_id').references(() => users.id, { onDelete: 'set null' }),
    kind: text('kind').$type<'sms_in' | 'sms_out' | 'voicemail'>().notNull(),
    phone: text('phone'),
    name: text('name'),
    body: text('body'),
    url: text('url'),
    seconds: integer('seconds'),
    // Dialerr's message id, so a webhook retry or a second source doesn't double-count.
    externalId: text('external_id'),
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [index('dialer_events_at_idx').on(t.at), uniqueIndex('dialer_events_external_idx').on(t.externalId)],
);

// Small key/value store for settings the owner edits in the admin (e.g. the Dialerr API token).
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

// A sale is a client on a monthly plan. Revenue and commission come from its payments.
export const SALE_STATUSES = ['pending', 'active', 'cancelled'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const sales = pgTable(
  'sales',
  {
    id: serial('id').primaryKey(),
    repId: integer('rep_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    leadId: integer('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    packageId: integer('package_id').references(() => packages.id, { onDelete: 'set null' }),
    clientName: text('client_name').notNull(),
    packageName: text('package_name').notNull(),
    // One-time setup fee (often $0); collected as the first payment when non-zero.
    priceCents: integer('price_cents').notNull().default(0),
    monthlyCents: integer('monthly_cents').notNull(),
    buildCostCents: integer('build_cost_cents').notNull().default(0),
    // Frozen when the sale is logged; every payment on this client earns the rep this %.
    commissionPct: numeric('commission_pct', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    status: text('status').$type<SaleStatus>().notNull().default('pending'),
    notes: text('notes'),
    closedAt: ts('closed_at').notNull().defaultNow(),
    cancelledAt: ts('cancelled_at'),
  },
  (t) => [index('sales_rep_closed_idx').on(t.repId, t.closedAt)],
);
export type Sale = typeof sales.$inferSelect;

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    repId: integer('rep_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    amountCents: integer('amount_cents').notNull(),
    commissionCents: integer('commission_cents').notNull(),
    // First day of the month this payment covers, e.g. 2026-10-01 (setup fees use the sign-up month).
    forMonth: text('for_month').notNull(),
    kind: text('kind').$type<'monthly' | 'setup'>().notNull().default('monthly'),
    paidAt: ts('paid_at').notNull().defaultNow(),
    commissionPaidAt: ts('commission_paid_at'),
  },
  (t) => [
    index('payments_rep_paid_idx').on(t.repId, t.paidAt),
    uniqueIndex('payments_sale_month_kind_idx').on(t.saleId, t.forMonth, t.kind),
  ],
);
export type Payment = typeof payments.$inferSelect;

export const FINDER_STATUSES = ['queued', 'running', 'done', 'failed', 'stopped'] as const;
export type FinderStatus = (typeof FINDER_STATUSES)[number];

export const REQUEST_STATUSES = ['pending', 'accepted', 'partial', 'fulfilled', 'denied'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const leadRequests = pgTable(
  'lead_requests',
  {
    id: serial('id').primaryKey(),
    repId: integer('rep_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    niche: text('niche'),
    area: text('area'),
    urgency: text('urgency').$type<'normal' | 'urgent'>().notNull().default('normal'),
    notes: text('notes'),
    status: text('status').$type<RequestStatus>().notNull().default('pending'),
    deliveredCount: integer('delivered_count').notNull().default(0),
    adminNote: text('admin_note'),
    createdAt: ts('created_at').notNull().defaultNow(),
    resolvedAt: ts('resolved_at'),
    lastMessageAt: ts('last_message_at').notNull().defaultNow(),
    // The Claude lead finder working on this request (null = handled by hand).
    finderStatus: text('finder_status').$type<FinderStatus>(),
    finderRounds: integer('finder_rounds').notNull().default(0),
    finderScanned: integer('finder_scanned').notNull().default(0), // businesses looked at
    finderQueries: jsonb('finder_queries').$type<string[]>().notNull().default([]),
    finderError: text('finder_error'),
    finderBeatAt: ts('finder_beat_at'), // last sign of life, to restart a run that died
  },
  (t) => [index('lead_requests_status_idx').on(t.status, t.createdAt)],
);
export type LeadRequest = typeof leadRequests.$inferSelect;

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => 'bytea',
  fromDriver: (v) => Buffer.from(v),
});

// Documents attached to a lead request (e.g. a spreadsheet of leads). Kept in Postgres: they're small (≤ 4 MB).
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id')
    .notNull()
    .references(() => leadRequests.id, { onDelete: 'cascade' }),
  uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  data: bytea('data').notNull(),
  // Leads created from this file (CSV only), so the rep sees how many landed in their list.
  importedCount: integer('imported_count'),
  createdAt: ts('created_at').notNull().defaultNow(),
});
export type FileRow = typeof files.$inferSelect;

// The conversation on a lead request: messages from either side plus status events.
export const requestMessages = pgTable(
  'request_messages',
  {
    id: serial('id').primaryKey(),
    requestId: integer('request_id')
      .notNull()
      .references(() => leadRequests.id, { onDelete: 'cascade' }),
    authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
    kind: text('kind').$type<'message' | 'event'>().notNull().default('message'),
    body: text('body'),
    fileId: integer('file_id').references(() => files.id, { onDelete: 'set null' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('request_messages_request_idx').on(t.requestId, t.createdAt)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body'),
    href: text('href'),
    readAt: ts('read_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.readAt, t.createdAt)],
);
export type Notification = typeof notifications.$inferSelect;

// Every business the lead finder has ever handed out, kept forever (even if the lead is deleted)
// so no business is ever given to a second rep.
export const finderPlaces = pgTable(
  'finder_places',
  {
    id: serial('id').primaryKey(),
    placeId: text('place_id').notNull(), // Google Maps place id
    phone: text('phone'), // last 10 digits
    name: text('name').notNull(),
    country: text('country'),
    leadId: integer('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    repId: integer('rep_id').references(() => users.id, { onDelete: 'set null' }),
    requestId: integer('request_id').references(() => leadRequests.id, { onDelete: 'set null' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('finder_places_place_idx').on(t.placeId), uniqueIndex('finder_places_phone_idx').on(t.phone)],
);
