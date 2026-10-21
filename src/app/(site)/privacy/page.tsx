import Link from 'next/link';
import { LegalPage } from '@/components/site/legal-page';
import { BRAND } from '@/lib/brand';

export const metadata = { title: `Privacy Policy — ${BRAND.name}` };

export default function Privacy() {
  const mail = <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>;
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what information {BRAND.legalName} (“{BRAND.name}”, “we”, “us”) collects, how we use it, and the choices you have. It covers
        this website and the website services we provide to our clients. We are based in {BRAND.location}, United States.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <b>When you request a quote or contact us:</b> your name, business name, phone number, email address, city, type of business, current website and
          anything you write in your message.
        </li>
        <li>
          <b>When you become a client:</b> the information needed to build and run your website, such as your business details, services, hours, photos and
          text, plus billing details. Card payments are handled by our payment processor; we do not store full card numbers.
        </li>
        <li>
          <b>Public business information:</b> to find businesses that may want a website, we look at publicly listed business information, such as a
          business’s name, phone number, address, category and reviews on Google Maps and similar directories.
        </li>
        <li>
          <b>Calls and messages:</b> when we call, text or email with you, we keep a record of the conversation, such as the date, length, outcome and notes.
          Calls may be recorded for quality and training; we will tell you at the start of a call if it is recorded.
        </li>
        <li>
          <b>Technical information:</b> like most websites, our hosting provider records basic request data such as IP address and browser type to keep the
          site secure and working. We do not use advertising trackers on this site.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To answer your request, prepare a quote and talk with you about our services.</li>
        <li>To build, host, update and support your website if you become a client, and to bill for it.</li>
        <li>To contact businesses about our services by phone, text or email, using publicly listed business contact details.</li>
        <li>To keep our records, improve our service and meet legal obligations.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Text messages</h2>
      <p>
        If you agree to receive text messages from us, message frequency varies and message and data rates may apply. Reply <b>STOP</b> to stop receiving
        texts or <b>HELP</b> for help. No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text
        messaging opt-in data and consent will not be shared with any third parties, except the service providers that deliver our messages.
      </p>

      <h2>Who we share it with</h2>
      <p>We share information only with service providers that help us run our business, and only as needed for them to do so:</p>
      <ul>
        <li>website hosting and database providers;</li>
        <li>our phone, texting and email providers;</li>
        <li>business-data and software providers we use to find and research businesses, including AI tools;</li>
        <li>our payment processor;</li>
        <li>domain registrars, to register and manage our clients’ domains.</li>
      </ul>
      <p>We may also disclose information if the law requires it, or to protect our rights, our clients or the public.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep information for as long as we need it for the purposes above. Client information is kept while you are a client and for a reasonable time
        afterwards for our records and legal obligations. You can ask us to delete your information at any time (see below).
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <b>Stop hearing from us:</b> tell us on a call, reply STOP to a text, or email {mail}, and we will stop contacting you and add your number to our
          do-not-contact list.
        </li>
        <li>
          <b>See, correct or delete your information:</b> email {mail} and we will respond within 30 days.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        We use reasonable safeguards to protect your information, including encrypted connections and access limited to our team. No method of storage or
        transmission is completely secure, so we cannot guarantee absolute security.
      </p>

      <h2>Cookies</h2>
      <p>
        Visitors to our public site are not tracked with cookies. Our team portal uses a necessary sign-in cookie for staff only, and saves small display
        preferences in your browser.
      </p>

      <h2>Children</h2>
      <p>Our services are for businesses. We do not knowingly collect information from children under 13.</p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. The date at the top shows when it last changed. Our <Link href="/terms">Terms of Service</Link> explain
        the terms of our website plans.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about this policy or your information: {mail}. {BRAND.legalName}, {BRAND.location}.
      </p>
    </LegalPage>
  );
}
