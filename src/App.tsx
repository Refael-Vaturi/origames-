import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import LevelUpCelebration from "@/components/LevelUpCelebration";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import PortalScreen from "./pages/PortalScreen";
import IronDomeGame from "./games/iron-dome/IronDomeGame";
import ClickerGame from "./games/clicker/ClickerGame";
import ColorIdentifyGame from "./games/color-identify/ColorIdentifyGame";
import CityFindGame from "./games/city-find/CityFindGame";
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

const queryClient = new QueryClient();

const LevelUpWrapper = () => {
  const { profile } = useAuth();
  return <LevelUpCelebration level={profile?.level || 0} />;
};

const App = () => (
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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
