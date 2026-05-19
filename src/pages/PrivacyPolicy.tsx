import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4">
      <Helmet>
        <title>Privacy Policy — Ori Games</title>
        <meta
          name="description"
          content="Privacy Policy for Ori Games — how we collect, use, and protect your data."
        />
        <link rel="canonical" href="https://origames.lovable.app/privacy-policy" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: May 19, 2026
          </p>

          <section className="space-y-6 text-base leading-relaxed">
            <p>
              Welcome to Ori Games ("we", "us", "our"). This Privacy Policy
              explains how we collect, use, and protect your information when
              you use our games and website at origames.lovable.app (the
              "Service").
            </p>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">1. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Account information:</strong> username, email address,
                  display name, avatar, and authentication provider (e.g.,
                  Google) when you sign up.
                </li>
                <li>
                  <strong>Gameplay data:</strong> scores, levels, progress,
                  achievements, friends, and in-game purchases (credits).
                </li>
                <li>
                  <strong>Technical data:</strong> device type, browser, IP
                  address, language preference, and basic usage analytics.
                </li>
                <li>
                  <strong>Payment data:</strong> processed securely by Stripe.
                  We do not store credit-card details on our servers.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide, maintain, and improve the Service.</li>
                <li>To save your progress and sync it across devices.</li>
                <li>To enable social features such as friends and leaderboards.</li>
                <li>To process payments for in-game credits.</li>
                <li>To display ads (including reward ads via Google AdSense).</li>
                <li>To detect and prevent fraud, abuse, and cheating.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">3. Third-Party Services</h2>
              <p>We use trusted third parties that may process your data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase</strong> — authentication, database, storage.</li>
                <li><strong>Google OAuth</strong> — optional sign-in method.</li>
                <li><strong>Stripe</strong> — payment processing.</li>
                <li><strong>Google AdSense</strong> — advertising.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">4. Cookies and Local Storage</h2>
              <p>
                We use cookies and local storage to keep you signed in, remember
                your preferences (language, sound), and analyze usage. You can
                clear them at any time from your browser settings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">5. Children's Privacy</h2>
              <p>
                Our Service is suitable for all ages, including children under
                13. We design our games to be family-friendly and we minimize
                the personal information we collect from any user. For
                children, we only collect the minimum data needed to run the
                game (such as username, progress, and scores) and we do not
                use this data for behavioral advertising or sell it to third
                parties. Parents or guardians may contact us at any time to
                review, change, or delete their child's information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">6. Data Retention</h2>
              <p>
                We keep your account data while your account is active. You can
                request deletion of your account and associated data at any
                time by contacting us.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">7. Your Rights</h2>
              <p>
                Depending on your jurisdiction (e.g., GDPR, CCPA), you may have
                the right to access, correct, export, or delete your personal
                data. Contact us to exercise these rights.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">8. Security</h2>
              <p>
                We use industry-standard security measures, including encrypted
                connections (HTTPS) and Row-Level Security on our database, to
                protect your data. No method of transmission over the Internet
                is 100% secure.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will
                post the new version on this page and update the "Last updated"
                date above.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">10. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please
                contact us through the support options inside the app.
              </p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
