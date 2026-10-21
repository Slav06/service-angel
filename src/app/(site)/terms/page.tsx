import Link from 'next/link';
import { LegalPage } from '@/components/site/legal-page';
import { BRAND } from '@/lib/brand';

export const metadata = { title: `Terms of Service — ${BRAND.name}` };

export default function Terms() {
  const mail = <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>;
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are an agreement between you (the business signing up, “you”) and {BRAND.legalName} (“{BRAND.name}”, “we”, “us”), based in{' '}
        {BRAND.location}. They apply when you sign up for a website plan or use this website. By signing up, you agree to them.
      </p>

      <h2>1. What we provide</h2>
      <p>For as long as your plan is active, we will:</p>
      <ul>
        <li>design and write a website for your business, and launch it, usually about two weeks after your consultation;</li>
        <li>host it, with an SSL certificate and backups;</li>
        <li>make reasonable content updates you ask for, such as new services, prices, hours and photos;</li>
        <li>set up basic local search listings, such as your Google Business Profile, when you give us access;</li>
        <li>register and manage your domain name (see section 5);</li>
        <li>give you a real person to contact for support.</li>
      </ul>
      <p>
        Larger projects outside these, such as online stores, custom software or a complete redesign, are not included unless we agree to them in writing.
      </p>

      <h2>2. Price and payment</h2>
      <ul>
        <li>The plan costs the monthly price shown on our website or agreed with you when you sign up, currently $500 a month.</li>
        <li>Your first month is paid when you sign up. There is no separate setup or design fee.</li>
        <li>After that, you are billed once a month, on the same date each month, until you cancel.</li>
        <li>Prices do not include any taxes that may apply.</li>
        <li>
          If a payment fails and isn’t fixed within 14 days of us telling you, we may take your site offline until it is paid. We’ll put it back up once
          your account is up to date.
        </li>
        <li>We will give you at least 30 days’ notice before any price change.</li>
      </ul>

      <h2>3. No contract — cancel anytime</h2>
      <p>
        Your plan is month-to-month, with no minimum term. To cancel, email us at {mail} before your next billing date and you will not be charged again.
        Your site stays live until the end of the month you have already paid for. We don’t refund partial months.
      </p>

      <h2>4. Your part</h2>
      <ul>
        <li>Give us accurate information about your business, and reply to our questions so we can launch on time.</li>
        <li>Only send us text, photos, logos and other material you own or have permission to use.</li>
        <li>Don’t ask us to publish anything illegal, misleading, or that infringes someone else’s rights. We may refuse or remove such content.</li>
      </ul>

      <h2>5. Who owns what</h2>
      <ul>
        <li>
          <b>Your content is yours:</b> your business name, logo, photos, the text you give us, and the text we write for your business.
        </li>
        <li>
          <b>Your domain:</b> while you’re a client, we register and manage your domain under {BRAND.name} so we can keep it running and renewed. If you
          cancel, we transfer it to you free of charge. Just ask, and we’ll send the transfer details within 14 days.
        </li>
        <li>
          <b>Our design and technology:</b> the website design, code, templates and hosting setup remain ours. You may use them while your plan is active,
          and that right ends when the plan ends.
        </li>
        <li>
          <b>When you leave:</b> you keep your domain, your text and your photos, and we’ll give you a copy of them if you ask. The site’s design and
          hosting end with your plan.
        </li>
        <li>We may show your website in our portfolio unless you ask us not to.</li>
      </ul>

      <h2>6. No guaranteed results</h2>
      <p>
        We build every site to help you get found and get more customers, but we can’t guarantee specific results such as a certain number of visitors,
        calls, sales or search ranking. Those depend on many things outside our control, including search engines and your market.
      </p>

      <h2>7. Availability</h2>
      <p>
        We aim to keep your site online at all times, but there may be occasional downtime for maintenance or problems with our hosting providers. We will
        work to fix any outage quickly.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the extent the law allows, our total liability for any claim relating to our services is limited to the amount you paid us in the three months
        before the claim. We are not liable for indirect or consequential losses, such as lost profits or lost business.
      </p>

      <h2>9. Ending the service</h2>
      <p>
        You can cancel as described in section 3. We may end your plan with 30 days’ notice for any reason, or right away if you seriously break these
        terms, for example by not paying or by asking us to publish illegal content. If we end it without cause, we refund any month you’ve paid for but
        not received, and we still transfer your domain and content to you.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these terms. If a change affects your plan, we’ll tell you at least 30 days before it takes effect. If you don’t agree, you can cancel
        before then.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Florida. Any dispute will be handled in the courts of Miami-Dade County, Florida.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms: {mail}. {BRAND.legalName}, {BRAND.location}. See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
