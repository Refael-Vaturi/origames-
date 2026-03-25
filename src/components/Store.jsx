import React, { useState } from 'react';
import { Clock, EyeOff, HelpCircle, Zap, CreditCard, X, ShoppingCart } from 'lucide-react';

export default function Store() {
  const [balance, setBalance] = useState(150); // כמות הקרדיטים שיש למשתמש כרגע
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // רשימת השדרוגים בחנות
  const upgrades = [
    { id: 1, name: 'זמן כפול', desc: 'מוסיף 10 שניות לשעון הניחושים בסיבוב', price: 50, icon: <Clock size={24} />, color: 'text-blue-400' },
    { id: 2, name: 'רמז נוסף', desc: 'חושף אות אחת מהתשובה הנכונה', price: 30, icon: <HelpCircle size={24} />, color: 'text-green-400' },
    { id: 3, name: 'הסתרת זהות', desc: 'הפוך לאנונימי בסיבוב הקרוב', price: 75, icon: <EyeOff size={24} />, color: 'text-purple-400' },
    { id: 4, name: 'פסילת תשובות', desc: 'מוחק 2 תשובות שגויות (50/50)', price: 100, icon: <Zap size={24} />, color: 'text-yellow-400' },
  ];

  const handleBuyClick = (item) => {
    setSelectedItem(item);
    setShowPaymentModal(true); // פותח את חלון התשלום
  };

  const processPayment = () => {
    // כאן תכנס הלוגיקה של סליקת אשראי אמיתית בעתיד
    if (balance >= selectedItem.price) {
      setBalance(balance - selectedItem.price);
      alert(`רכשת בהצלחה את: ${selectedItem.name}!`);
      setShowPaymentModal(false);
    } else {
      alert('אין לך מספיק קרדיטים למערכת. כאן נוכל לחבר בהמשך סליקת אשראי.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans" dir="rtl">
      {/* אזור עליון - כותרת ומצב חשבון */}
      <div className="flex justify-between items-center mb-10 border-b border-slate-700 pb-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          חנות השדרוגים
        </h1>
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-600 shadow-md">
          <Zap className="text-yellow-400" size={20} />
          <span className="font-bold">{balance} קרדיטים</span>
        </div>
      </div>

      {/* רשת המוצרים */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {upgrades.map((item) => (
          <div key={item.id} className="bg-slate-800 rounded-2xl p-6 flex flex-col justify-between border border-slate-700 hover:border-purple-500 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-4 bg-slate-900 rounded-xl shadow-inner border border-slate-700 ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold">{item.name}</h3>
                <p className="text-slate-400 text-sm mt-1">{item.desc}</p>
              </div>
            </div>
            <button 
              onClick={() => handleBuyClick(item)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-purple-600 text-white py-3 rounded-xl font-bold transition-all hover:scale-[1.02]"
            >
              <CreditCard size={18} />
              קנה ב-{item.price}
            </button>
          </div>
        ))}
      </div>

      {/* חלון קופץ (Modal) לתשלום */}
      {showPaymentModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-3xl max-w-md w-full p-8 border border-slate-600 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
            
            <div className="flex justify-between items-center mb-8 mt-2">
              <h2 className="text-2xl font-bold">אישור רכישה</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-900 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-slate-900 rounded-2xl p-6 mb-8 flex justify-between items-center border border-slate-700 shadow-inner">
              <div>
                <p className="text-slate-500 text-sm mb-1">הפריט שלך:</p>
                <p className="font-bold text-xl">{selectedItem.name}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-sm mb-1">סה"כ לתשלום:</p>
                <p className="font-bold text-2xl text-yellow-400 flex items-center justify-end gap-1">
                  {selectedItem.price} <Zap size={20} />
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={processPayment}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center justify-center gap-3 hover:scale-[1.02]"
              >
                <ShoppingCart size={22} />
                השלם רכישה
              </button>
              <p className="text-center text-xs text-slate-500 leading-relaxed mt-4">
                * כרגע המערכת מחייבת את מאזן הקרדיטים שלך. בקרוב ניתן יהיה לשלב כאן מסך סליקה מאובטח לתשלום בכרטיס אשראי.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
