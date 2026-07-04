import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4">
      <Helmet>
        <title>Terms of Service — Ori Games</title>
        <meta
          name="description"
          content="Terms of Service for Ori Games — the rules for playing, community conduct, and account usage."
        />
        <link rel="canonical" href="/terms" />
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
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: July 4, 2026</p>

          <section className="space-y-6 text-base leading-relaxed">
            <p>
              These Terms of Service ("Terms") govern your access to and use of Ori Games and its multiplayer
              and single-player game modes ("Service"). By using the Service you agree to these Terms.
            </p>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">1. Accounts</h2>
              <p>
                You may create an account with a unique username. You are responsible for your account and for
                keeping your credentials confidential. One person, one account. Accounts used to cheat, harass
                others, or exploit the Service may be suspended or terminated.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">2. Fair Play & Community Rules</h2>
              <ul className="list-disc ps-6 space-y-2">
                <li>No cheating, botting, macros, or third-party tools that alter gameplay.</li>
                <li>No harassment, hate speech, doxxing, or targeted abuse of other players in chat, room names, or usernames.</li>
                <li>No sharing of illegal content, malware, or spam links inside rooms or messages.</li>
                <li>Respect the multiplayer lobby: don't grief hosts, don't disconnect intentionally to ruin matches.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">3. Virtual Currency & Purchases</h2>
              <p>
                Coins, hearts, credits, and other in-game currencies have no cash value, are non-transferable,
                and are not redeemable for real money. Purchases of credit packs are processed by our payment
                provider and are final except where required by law.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">4. User Content</h2>
              <p>
                You retain ownership of content you submit (usernames, chat messages, room names). You grant
                us a non-exclusive license to display that content inside the Service so other players can see
                it. We may remove content that violates these Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">5. Advertising</h2>
              <p>
                The Service may display advertising served by Google AdSense and other partners. Ads help keep
                core play free. See our{" "}
                <Link to="/privacy-policy" className="underline">
                  Privacy Policy
                </Link>{" "}
                for how advertising cookies are handled.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">6. Termination</h2>
              <p>
                We may suspend or terminate access to the Service, with or without notice, if you violate these
                Terms. You may stop using the Service at any time and request account deletion by contacting us.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">7. Disclaimer</h2>
              <p>
                The Service is provided "as is" without warranties of any kind. We do not guarantee that the
                Service will be uninterrupted, error-free, or that saved progress cannot be lost.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">8. Changes</h2>
              <p>
                We may update these Terms from time to time. Continued use of the Service after changes means
                you accept the updated Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mt-8 mb-3">9. Contact</h2>
              <p>
                Questions about these Terms? Visit our{" "}
                <Link to="/contact" className="underline">
                  Contact page
                </Link>
                .
              </p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};

export default TermsOfService;
