import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — What My Pet Thinks",
  description: "Privacy policy for What My Pet Thinks, the AI pet thought translator.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-8">
        Privacy Policy
      </h1>
      <p className="text-sm text-charcoal-light mb-8">Last updated: February 13, 2026</p>

      <div className="space-y-6 text-charcoal-light leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">What We Collect</h2>
          <p>
            <strong>Photos you upload</strong> are sent to our server solely to generate captions.
            We do not store your photos on our servers — they are processed in memory and immediately
            discarded after the caption is returned to your device.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Local Storage</h2>
          <p>
            What My Pet Thinks stores the following data locally on your device (never on our servers):
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Your recent translation history (thumbnails and captions)</li>
            <li>Usage credits and share counts</li>
            <li>Waitlist email address (if you choose to join)</li>
            <li>Install prompt dismissal preference</li>
          </ul>
          <p className="mt-2">
            You can clear this data at any time by clearing your browser&apos;s site data for
            whatmypetthinks.com.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">AI Processing</h2>
          <p>
            Your pet photos are analyzed by Anthropic&apos;s Claude AI to generate captions. The
            images are sent via a secure HTTPS connection and are not used to train AI models.
            Anthropic&apos;s privacy policy applies to this processing:{" "}
            <a
              href="https://www.anthropic.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal underline hover:text-teal/80"
            >
              anthropic.com/privacy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Sharing</h2>
          <p>
            When you share a captioned image, the sharing is handled entirely by your device&apos;s
            native share functionality. We do not track or store what you share or who you share
            with.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Analytics</h2>
          <p>
            We use Google Analytics 4 (GA4) to understand how people use What My Pet Thinks. GA4 collects
            anonymous usage data such as page views, button clicks, and device type. No photos or
            captions are sent to Google. You can opt out of GA4 tracking by using a browser extension
            like{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal underline hover:text-teal/80"
            >
              Google Analytics Opt-out
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Cookies</h2>
          <p>
            What My Pet Thinks does not use cookies. All preferences are stored in your browser&apos;s
            localStorage.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Children&apos;s Privacy</h2>
          <p>
            What My Pet Thinks is a general audience app. We do not knowingly collect personal information
            from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Changes</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this page with an
            updated date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-charcoal mb-2">Contact</h2>
          <p>
            Questions about this policy? Reach us at{" "}
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
