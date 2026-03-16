import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<WelcomeScreen />} />
              <Route path="/home" element={<HomeScreen />} />
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/join" element={<JoinByCodeScreen />} />
              <Route path="/create-room" element={<CreateRoomScreen />} />
              <Route path="/lobby" element={<LobbyScreen />} />
              <Route path="/matchmaking" element={<MatchmakingScreen />} />
              <Route path="/tutorial" element={<TutorialScreen />} />
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
