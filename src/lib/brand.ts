// Business identity in one place: rename here and the whole site follows.
export const BRAND = {
  name: 'Service Angel',
  tagline: 'Websites that bring local businesses more customers.',
  phone: process.env.NEXT_PUBLIC_BRAND_PHONE ?? '',
  email: process.env.NEXT_PUBLIC_BRAND_EMAIL ?? '',
};

// Stats are bucketed by day/week/month in the business's own time zone.
export const APP_TZ = process.env.APP_TZ ?? 'America/New_York';
