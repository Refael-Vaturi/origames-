import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import logoImage from "@/assets/ori-games-logo.png";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <img src={logoImage} alt="Ori Games" className="w-20 h-20 mb-3" />
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-primary to-[hsl(var(--game-pink))] bg-clip-text text-transparent">
            About Ori Games
          </h1>
        </motion.div>

        <article className="prose prose-invert max-w-none text-foreground space-y-5 font-body leading-relaxed">
          <p>
            <strong>Ori Games</strong> is a social, browser-based gaming portal (installable as a PWA) that brings
            together a curated collection of fast, colorful, and addictive mini-games under one roof. It's designed
            for all ages — from kids under 13 looking for a safe, family-friendly playground, to adults who want a
            quick, satisfying break from their day. The platform is built mobile-first, fully responsive, and supports
            20 languages with full RTL handling, so anyone, anywhere can jump in and play in their own language.
          </p>

          <h2 className="font-display text-2xl font-bold mt-8">One Portal, Many Worlds</h2>
          <p>
            The portal screen is the heart of Ori Games. It's a bright, animated hub where players choose from a
            growing lineup of mini-games, each represented by a colorful card with its own personality. Today the
            lineup includes:
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong>Fake It Fast</strong> — a 3+ player social deduction party game where one player is secretly the
              "faker" who doesn't know the secret word. Bluff, ask questions, and vote to unmask them — or fool
              everyone if you're the faker. Includes a single-player Practice Mode with adaptive AI bots that scale
              their difficulty to your skill level.
            </li>
            <li>
              <strong>Iron Dome</strong> — a single-player missile-defense arcade game with both Campaign and Survival
              modes, adaptive wave difficulty, armored enemies, boss waves, colored power-up missiles, passive perks
              that unlock as you progress, a Helicopter Airstrike special ability, a combo system that rewards rapid
              interceptions, persistent star-based progression, upgrades you can buy with credits, and a global +
              friends leaderboard. Revive after death with an optional rewarded ad.
            </li>
            <li>
              <strong>Clicker</strong> — tap as fast as you can, buy upgrades, and climb the leaderboard.
            </li>
            <li>
              <strong>Identify the Color</strong> — spot the odd-colored tile out of a grid; tiers get progressively
              harder.
            </li>
            <li>
              <strong>CityFind</strong> — guess world cities from photos, available in English and Hebrew.
            </li>
          </ul>
          <p>
            More games are constantly being added — the "coming soon" tile on the portal is always alive.
          </p>

          <h2 className="font-display text-2xl font-bold mt-8">Built for Everyone</h2>
          <p>
            Ori Games was designed from the ground up to feel welcoming to children under 13 as well as adults.
            There's no violent imagery, no adult content, and no chat with strangers — friendships happen through
            invite codes, friend requests, and digital QR-code friend cards that let you connect with people you
            actually know. Parents can feel comfortable handing the phone over: the UI is cheerful, the back button
            is hidden during active gameplay so kids stay focused, and an animated settings gear keeps controls
            within easy reach without cluttering the screen.
          </p>

          <h2 className="font-display text-2xl font-bold mt-8">Social & Connected</h2>
          <p>
            Players can sign up with a unique username (or via Google OAuth), build a profile with levels and
            achievements, add friends, see who's online, compete on leaderboards (global and friends-only), and share
            digital friend cards via QR code. Real-time multiplayer rooms power Fake It Fast — you can create a
            private room, share a join code, or jump into matchmaking.
          </p>

          <h2 className="font-display text-2xl font-bold mt-8">Polished & Playful</h2>
          <p>
            Every screen is built with the same arcade-meets-Apple philosophy: bright gradients, smooth Framer Motion
            transitions, satisfying haptic-style feedback, vivid explosions and fireworks for celebrations, screen
            shake on big hits, and a UI that gets out of the way the moment you start playing. The whole platform
            installs as a PWA on iOS and Android, so it lives on your home screen like a native app — no app store
            required.
          </p>

          <h2 className="font-display text-2xl font-bold mt-8">A Global Playground</h2>
          <p>
            With support for 20 languages including English, Hebrew, Spanish, French, German, Arabic, Russian,
            Chinese, Japanese, Portuguese and more, Ori Games is genuinely a portal for the whole world. RTL is
            handled natively — Hebrew and Arabic players get a layout that feels native, not bolted on.
          </p>

          <p>
            Whether you're bluffing your way through a Fake It Fast round with friends, chaining 50-missile combos in
            Iron Dome, or chasing a CityFind streak on the bus — Ori Games is built to make "just one more round"
            feel irresistible. 🎮✨
          </p>
        </article>
      </div>
    </div>
  );
};

export default About;
