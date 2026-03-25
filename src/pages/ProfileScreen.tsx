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
import React, { useState } from 'react';
import { Clock, EyeOff, HelpCircle, Zap, CreditCard, X, ShoppingCart } from 'lucide-react';

// --- קומפוננטת החנות (Store) ---
interface UpgradeItem {
  id: number;
  name: string;
  desc: string;
  price: number;
  icon: React.ReactNode;
  color: string;
}

const Store = () => {
  const [balance, setBalance] = useState<number>(150);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<UpgradeItem | null>(null);

  const upgrades: UpgradeItem[] = [
    { id: 1, name: 'זמן כפול', desc: 'מוסיף 10 שניות לשעון הניחושים', price: 50, icon: <Clock size={24} />, color: 'text-blue-400' },
    { id: 2, name: 'רמז נוסף', desc: 'חושף אות אחת מהתשובה', price: 30, icon: <HelpCircle size={24} />, color: 'text-green-400' },
    { id: 3, name: 'הסתרת זהות', desc: 'הפוך לאנונימי בסיבוב הקרוב', price: 75, icon: <EyeOff size={24} />, color: 'text-purple-400' },
    { id: 4, name: 'פסילת תשובות', desc: 'מוחק 2 תשובות שגויות (50/50)', price: 100, icon: <Zap size={24} />, color: 'text-yellow-400' },
  ];

  const handleBuyClick = (item: UpgradeItem) => {
    setSelectedItem(item);
    setShowPaymentModal(true);
  };

  const processPayment = () => {
    if (selectedItem && balance >= selectedItem.price) {
      setBalance(balance - selectedItem.price);
      alert(`רכשת בהצלחה את: ${selectedItem.name}!`);
      setShowPaymentModal(false);
    } else {
      alert('אין לך מספיק קרדיטים.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans" dir="rtl">
      <div className="flex justify-between items-center mb-10 border-b border-slate-700 pb-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          חנות השדרוגים
        </h1>
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-600 shadow-md">
          <Zap className="text-yellow-400" size={20} />
          <span className="font-bold">{balance} קרדיטים</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {upgrades.map((item) => (
          <div key={item.id} className="bg-slate-800 rounded-2xl p-6 flex flex-col justify-between border border-slate-700 hover:border-purple-500 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-4 bg-slate-900 rounded-xl shadow-inner border border-slate-700 ${item.color}`}>
                {item.icon}
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold">{item.name}</h3>
                <p className="text-slate-400 text-sm mt-1">{item.desc}</p>
              </div>
            </div>
            <button 
              onClick={() => handleBuyClick(item)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-purple-600 text-white py-3 rounded-xl font-bold transition-all"
            >
              <CreditCard size={18} />
              קנה ב-{item.price}
            </button>
          </div>
        ))}
      </div>

      {showPaymentModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-3xl max-w-md w-full p-8 border border-slate-600 shadow-2xl relative overflow-hidden text-right">
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">אישור רכישה</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white bg-slate-900 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 mb-8 flex justify-between items-center">
               <div className="text-right">
                <p className="text-slate-500 text-sm">סה"כ לתשלום:</p>
                <p className="font-bold text-2xl text-yellow-400">{selectedItem.price} <Zap size={20} className="inline" /></p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-sm">הפריט:</p>
                <p className="font-bold text-xl text-white">{selectedItem.name}</p>
              </div>
            </div>
            <button 
              onClick={processPayment}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform"
            >
              השלם רכישה
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- שאר הגדרות האפליקציה ---
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
              <Route path="/store" element={<Store />} /> {/* הוספנו את החנות כאן! */}

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
