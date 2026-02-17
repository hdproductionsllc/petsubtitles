import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — What My Pet Thinks",
  description: "Terms of service for What My Pet Thinks, the AI pet thought translator.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-8">
        Terms of Service
      </h1>
      <p className="text-sm text-charcoal-light mb-8">Last updated: February 17, 2026</p>

      <div className="space-y-6 text-charcoal-light leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Your Content</h2>
          <p>
            You confirm that photos you upload are yours or you have permission to use them.
            You retain ownership of your original photos. Captioned and conversation images are
            generated for your personal use and sharing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Acceptable Use</h2>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Upload only photos you own or have rights to</li>
            <li>No photos of people&apos;s faces without consent</li>
            <li>No illegal, explicit, or harmful content</li>
            <li>No automated requests or scraping</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">The AI Conversations</h2>
          <p>
            All text conversations and captions are AI-generated humor, not actual pet thoughts.
            There is no guarantee that results will be funny or appropriate. Don&apos;t like the
            result? Regenerate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Service &amp; Pricing</h2>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Free tier: 3 translations per day</li>
            <li>PRO: $5.99/month, 10 translations per day, all voice styles</li>
            <li>Pricing may change with notice</li>
            <li>Subscriptions managed via Stripe Customer Portal</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Payments &amp; Cancellation</h2>
          <p>
            Paid subscriptions are billed monthly through{" "}
            <a
              href="https://stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal underline hover:text-teal/80"
            >
              Stripe
            </a>
            . You can cancel your subscription at any time through the Manage Subscription link
            in the app. Cancellation takes effect at the end of your current billing period.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">User-Generated Content &amp; Marketing</h2>
          <p>
            By using What My Pet Thinks, you grant us a non-exclusive, royalty-free, worldwide license
            to use, display, reproduce, and distribute the AI-generated captions, text conversations,
            and composited images created through the service for marketing, promotional, and
            advertising purposes.
          </p>
          <p className="mt-2">
            If you do not want your generated content used for marketing, contact us at{" "}
            <a
              href="mailto:hello@whatmypetthinks.com"
              className="text-teal underline hover:text-teal/80"
            >
              hello@whatmypetthinks.com
            </a>{" "}
            and we will remove it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Limitation of Liability</h2>
          <p>
            What My Pet Thinks is provided &ldquo;as is&rdquo; without warranties of any kind. We are
            not responsible for AI-generated content or any consequences of sharing that content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Changes</h2>
          <p>
            We may update these terms from time to time. Changes will be posted on this page with an
            updated date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Contact</h2>
          <p>
            Questions about these terms? Reach us at{" "}
            <a
              href="mailto:hello@whatmypetthinks.com"
              className="text-teal underline hover:text-teal/80"
            >
              hello@whatmypetthinks.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <a
          href="/"
          className="text-teal font-bold hover:text-teal/80"
        >
          &larr; Back to What My Pet Thinks
        </a>
      </div>
    </main>
  );
}
