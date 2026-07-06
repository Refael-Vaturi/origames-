import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import LevelUpCelebration from "@/components/LevelUpCelebration";
import { useAuth } from "@/contexts/AuthContext";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import PortalScreen from "./pages/PortalScreen";
import IronDomeGame from "./games/iron-dome/IronDomeGame";
import ClickerGame from "./games/clicker/ClickerGame";
import ColorIdentifyGame from "./games/color-identify/ColorIdentifyGame";
import CityFindGame from "./games/city-find/CityFindGame";
import GravityFlipGame from "./games/gravity-flip/GravityFlipGame";
import RhythmBladeGame from "./games/rhythm-blade/RhythmBladeGame";
import VelocityDriftGame from "./games/velocity-drift/VelocityDriftGame";
import CyberShieldGame from "./games/cyber-shield/CyberShieldGame";
import FruitMergeGame from "./games/fruit-merge/FruitMergeGame";
import MergeTycoonGame from "./games/merge-tycoon/MergeTycoonGame";
import WobbleRaceGame from "./games/wobble-race/WobbleRaceGame";
import WelcomeScreen from "./pages/WelcomeScreen";
import HomeScreen from "./pages/HomeScreen";
import JoinByCodeScreen from "./pages/JoinByCodeScreen";
import CreateRoomScreen from "./pages/CreateRoomScreen";
import LobbyScreen from "./pages/LobbyScreen";
import MatchmakingScreen from "./pages/MatchmakingScreen";
import TutorialScreen from "./pages/TutorialScreen";
import GameScreen from "./pages/GameScreen";
import ResultsScreen from "./pages/ResultsScreen";
import AuthScreen from "./pages/AuthScreen";
import ProfileScreen from "./pages/ProfileScreen";
import SettingsScreen from "./pages/SettingsScreen";
import FriendsScreen from "./pages/FriendsScreen";
import PracticeScreen from "./pages/PracticeScreen";
import NotFound from "./pages/NotFound";
import AdminGuard from "./components/AdminGuard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlayerActions from "./pages/admin/AdminPlayerActions";
import AdminLivePlayers from "./pages/admin/AdminLivePlayers";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminDownload from "./pages/admin/AdminDownload";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminLiveRooms from "./pages/admin/AdminLiveRooms";
import AdminGameRecordings from "./pages/admin/AdminGameRecordings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ContactUs from "./pages/ContactUs";
import About from "./pages/About";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const LevelUpWrapper = () => {
  const { profile } = useAuth();
  return <LevelUpCelebration level={profile?.level || 0} />;
};

const App = () => {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
        <AuthProvider>
          <LevelUpWrapper />
          <BrowserRouter>
            <Routes>
              {/* Portal - Main hub */}
              <Route path="/" element={<PortalScreen />} />

              {/* Iron Dome game */}
              <Route path="/iron-dome" element={<IronDomeGame />} />

              {/* New arcade games */}
              <Route path="/clicker" element={<ClickerGame />} />
              <Route path="/color-identify" element={<ColorIdentifyGame />} />
              <Route path="/city-find" element={<CityFindGame />} />
              <Route path="/gravity-flip" element={<GravityFlipGame />} />
              <Route path="/rhythm-blade" element={<RhythmBladeGame />} />
              <Route path="/velocity-drift" element={<VelocityDriftGame />} />
              <Route path="/cyber-shield" element={<CyberShieldGame />} />
              <Route path="/fruit-merge" element={<FruitMergeGame />} />
              <Route path="/merge-tycoon" element={<MergeTycoonGame />} />
              <Route path="/wobble-race" element={<WobbleRaceGame />} />

              {/* Fake It Fast game routes */}
              <Route path="/fake-it-fast" element={<HomeScreen />} />
              <Route path="/fake-it-fast/welcome" element={<WelcomeScreen />} />
              <Route path="/fake-it-fast/join" element={<JoinByCodeScreen />} />
              <Route path="/fake-it-fast/create-room" element={<CreateRoomScreen />} />
              <Route path="/fake-it-fast/lobby" element={<LobbyScreen />} />
              <Route path="/fake-it-fast/matchmaking" element={<MatchmakingScreen />} />
              <Route path="/fake-it-fast/tutorial" element={<TutorialScreen />} />
              <Route path="/fake-it-fast/practice" element={<PracticeScreen />} />
              <Route path="/fake-it-fast/game" element={<GameScreen />} />
              <Route path="/fake-it-fast/results" element={<ResultsScreen />} />

              {/* Shared routes */}
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/friends" element={<FriendsScreen />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />

              {/* Legacy redirects */}
              <Route path="/welcome" element={<WelcomeScreen />} />
              <Route path="/join" element={<JoinByCodeScreen />} />
              <Route path="/create-room" element={<CreateRoomScreen />} />
              <Route path="/lobby" element={<LobbyScreen />} />
              <Route path="/matchmaking" element={<MatchmakingScreen />} />
              <Route path="/tutorial" element={<TutorialScreen />} />
              <Route path="/practice" element={<PracticeScreen />} />
              <Route path="/game" element={<GameScreen />} />
              <Route path="/results" element={<ResultsScreen />} />

              {/* Admin */}
              <Route element={<AdminGuard />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="player-actions" element={<AdminPlayerActions />} />
                  <Route path="live" element={<AdminLivePlayers />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="download" element={<AdminDownload />} />
                  <Route path="announcements" element={<AdminAnnouncements />} />
                  <Route path="rooms" element={<AdminLiveRooms />} />
                  <Route path="recordings" element={<AdminGameRecordings />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
