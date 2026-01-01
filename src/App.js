import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection 
} from 'firebase/firestore';
import { 
  Heart, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Camera, 
  Download, 
  Upload, 
  RefreshCw, 
  PieChart,
  LogOut,
  X,
  AlertCircle,
  Coffee // 新增咖啡圖標
} from 'lucide-react';

// --- Firebase Configuration (Preview Mode) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Bible Verses (New Testament) ---
const BIBLE_VERSES = [
  { text: "我靠著那加給我力量的，凡事都能做。", ref: "腓立比書 4:13" },
  { text: "應當一無掛慮，只要凡事藉著禱告、祈求，和感謝，將你們所要的告訴神。", ref: "腓立比書 4:6" },
  { text: "信就是所望之事的實底，是未見之事的確據。", ref: "希伯來書 11:1" },
  { text: "愛是恆久忍耐，又有恩慈；愛是不嫉妒；愛是不自誇，不張狂。", ref: "哥林多前書 13:4" },
  { text: "你們祈求，就給你們；尋找，就尋見；叩門，就給你們開門。", ref: "馬太福音 7:7" },
  { text: "神若幫助我們，誰能敵擋我們呢？", ref: "羅馬書 8:31" },
  { text: "我們曉得萬事都互相效力，叫愛神的人得益處。", ref: "羅馬書 8:28" },
  { text: "不要為明天憂慮，因為明天自有明天的憂慮；一天的難處一天當就夠了。", ref: "馬太福音 6:34" },
  { text: "喜樂的心乃是良藥；憂傷的靈使骨枯乾。", ref: "箴言 17:22" },
  { text: "因為神賜給我們，不是膽怯的心，乃是剛強、仁愛、謹守的心。", ref: "提摩太後書 1:7" },
  { text: "凡勞苦擔重擔的人可以到我這裡來，我就使你們得安息。", ref: "馬太福音 11:28" },
  { text: "願恩惠、平安從神我們的父並主耶穌基督歸與你們。", ref: "哥林多前書 1:3" }
];

// --- Utility Functions ---
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const formatCurrency = (amount, currency = 'KRW') => {
  const num = Number(amount) || 0;
  switch(currency) {
    case 'TWD': return `NT$ ${num.toLocaleString()}`;
    case 'KRW': return `₩ ${num.toLocaleString()}`;
    case 'JPY': return `¥ ${num.toLocaleString()}`;
    case 'USD': return `$ ${num.toLocaleString()}`;
    case 'CNY': return `¥ ${num.toLocaleString()}`;
    default: return `${num.toLocaleString()}`;
  }
};

// 咖啡廳風格配色：使用深咖啡色、焦糖色、抹茶綠等
const EXPENSE_CATEGORIES = [
  { id: 'food', label: '飲食 (식사)', color: '#D4A373' }, // Latte Color
  { id: 'transport', label: '交通 (교통)', color: '#CCD5AE' }, // Matcha
  { id: 'medical', label: '醫療 (의료)', color: '#E9EDC9' }, // Light Matcha
  { id: 'entertainment', label: '娛樂 (오락)', color: '#FAEDCD' }, // Cream
  { id: 'other', label: '其他 (기타)', color: '#A98467' }, // Dark Roast
];

const PAYMENT_METHODS = [
  { id: 'cash', label: '現金 (현금)', color: '#6F4E37' }, // Coffee Bean
  { id: 'card', label: '刷卡 (카드)', color: '#B5838D' }, // Berry
];

// --- Sub-Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241B]/40 backdrop-blur-md transition-all">
      <div className="bg-[#FEFBF5] rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#E6DCC3]">
        <div className="flex justify-between items-center p-6 border-b border-[#E6DCC3] bg-[#FFF8E7]">
          <h3 className="text-lg font-bold text-[#433422]">{title}</h3>
          <button onClick={onClose} className="p-2 bg-[#F3E5D8] rounded-full hover:bg-[#E6D0BC] transition text-[#6F4E37]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const SimplePieChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) return (
    <div className="flex items-center justify-center h-48 w-48 rounded-full bg-[#F3E5D8] mx-auto border-4 border-[#FFF8E7]">
      <span className="text-xs text-[#9C826B]">No Data</span>
    </div>
  );

  if (data.length === 1 || (data.length > 0 && data[0].value === total)) {
     return (
        <div className="relative h-48 w-48 mx-auto my-4 drop-shadow-md">
           <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="50" fill={data[0].color} stroke="#FEFBF5" strokeWidth="3" />
           </svg>
        </div>
     )
  }

  let currentAngle = 0;
  return (
    <div className="relative h-48 w-48 mx-auto my-4 drop-shadow-md">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
        {data.map((item) => {
          const sliceAngle = (item.value / total) * 360;
          
          const x1 = 50 + 50 * Math.cos(Math.PI * currentAngle / 180);
          const y1 = 50 + 50 * Math.sin(Math.PI * currentAngle / 180);
          const x2 = 50 + 50 * Math.cos(Math.PI * (currentAngle + sliceAngle) / 180);
          const y2 = 50 + 50 * Math.sin(Math.PI * (currentAngle + sliceAngle) / 180);
          
          const largeArc = sliceAngle > 180 ? 1 : 0;
          
          const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
          
          const path = (
            <path
              key={item.name}
              d={pathData}
              fill={item.color}
              stroke="#FEFBF5"
              strokeWidth="3"
            />
          );
          currentAngle += sliceAngle;
          return path;
        })}
      </svg>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-3 transition-all duration-300 ${
      active ? 'text-[#6F4E37] scale-105' : 'text-[#B09E90] hover:text-[#8D7666]'
    }`}
  >
    <div className={`p-2 rounded-2xl mb-1 transition-all ${active ? 'bg-[#F3E5D8] shadow-sm' : 'bg-transparent'}`}>
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-bold tracking-wider">{label}</span>
  </button>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('savings');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [currency, setCurrency] = useState('TWD');
  
  const [savings, setSavings] = useState({});
  const [goal, setGoal] = useState(100000);
  const [wishlist, setWishlist] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bibleVerse, setBibleVerse] = useState(BIBLE_VERSES[0]);

  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);

  const [tempAmount, setTempAmount] = useState('');
  const [tempExpense, setTempExpense] = useState({ title: '', amount: '', category: 'food', method: 'cash' });
  const [tempWish, setTempWish] = useState({ name: '', price: '', platform: '', image: '' });

  // Init Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Data Sync
  useEffect(() => {
    if (!user || !db) return;
    const savingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'savings');
    const expensesRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'expenses');
    const wishlistRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'wishlist');
    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'settings');

    const unsubSavings = onSnapshot(savingsRef, (doc) => { if (doc.exists()) setSavings(doc.data().data || {}); });
    const unsubExpenses = onSnapshot(expensesRef, (doc) => { if (doc.exists()) setExpenses(doc.data().data || []); });
    const unsubWishlist = onSnapshot(wishlistRef, (doc) => { if (doc.exists()) setWishlist(doc.data().data || []); });
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.goal) setGoal(data.goal);
        if (data.currency) setCurrency(data.currency);
      }
    });

    return () => { unsubSavings(); unsubExpenses(); unsubWishlist(); unsubSettings(); };
  }, [user]);

  // Save Data
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!user || !db) return;
    const saveData = async () => {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'savings'), { data: savings }, { merge: true });
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'expenses'), { data: expenses }, { merge: true });
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'wishlist'), { data: wishlist }, { merge: true });
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'settings'), { goal, currency }, { merge: true });
      } catch (e) { console.error("Error saving data:", e); }
    };
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [savings, expenses, wishlist, goal, currency, user]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const yearSavings = useMemo(() => Object.entries(savings).reduce((acc, [dateStr, amount]) => dateStr.startsWith(currentYear.toString()) ? acc + Number(amount) : acc, 0), [savings, currentYear]);
  const progressPercentage = Math.min(100, Math.max(0, (yearSavings / goal) * 100));
  const wishlistTotal = useMemo(() => wishlist.reduce((acc, item) => acc + Number(item.price), 0), [wishlist]);
  
  const dailyExpenses = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = formatDateKey(selectedDate);
    return expenses.filter(e => e.date === dateStr);
  }, [expenses, selectedDate]);

  const monthlyExpenses = useMemo(() => {
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return expenses.filter(e => e.date.startsWith(monthStr));
  }, [expenses, currentYear, currentMonth]);

  const expenseCategoryData = useMemo(() => {
    const data = EXPENSE_CATEGORIES.map(cat => ({
      name: cat.label,
      value: monthlyExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + Number(e.amount), 0),
      color: cat.color
    }));
    return data.filter(d => d.value > 0);
  }, [monthlyExpenses]);

  const expenseMethodData = useMemo(() => {
    const data = PAYMENT_METHODS.map(m => ({
      name: m.label,
      value: monthlyExpenses.filter(e => e.method === m.id).reduce((sum, e) => sum + Number(e.amount), 0),
      color: m.color
    }));
    return data.filter(d => d.value > 0);
  }, [monthlyExpenses]);

  const handleGoogleLogin = async () => { alert("目前為預覽模式，資料將暫時同步到測試資料庫。請在 Vercel 部署成功後使用正式登入！"); };
  const handleLogout = async () => { await signOut(auth); await signInAnonymously(auth); };
  const changeMonth = (delta) => { setCurrentDate(new Date(currentYear, currentMonth + delta, 1)); };
  const goToToday = () => { const now = new Date(); setCurrentDate(now); setSelectedDate(now); };
  function formatDateKey(date) { if (!date) return ''; const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }
  
  const handleDateClick = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    setSelectedDate(date);
    setTempAmount(savings[formatDateKey(date)] || ''); 
    if (activeTab === 'savings') setShowSavingsModal(true);
    else if (activeTab === 'expenses') setShowDayDetailModal(true);
  };

  const saveMoney = () => {
    if (!selectedDate) return;
    const key = formatDateKey(selectedDate);
    if (tempAmount === '') { const newSavings = { ...savings }; delete newSavings[key]; setSavings(newSavings); }
    else { setSavings(prev => ({ ...prev, [key]: Number(tempAmount) })); }
    setShowSavingsModal(false);
  };

  const addWishItem = () => {
    if (!tempWish.name || !tempWish.price) return;
    const newItem = { id: Date.now(), ...tempWish, price: Number(tempWish.price) };
    setWishlist([...wishlist, newItem]);
    setTempWish({ name: '', price: '', platform: '', image: '' });
    setShowWishlistModal(false);
  };

  const deleteWishItem = (id) => { setWishlist(wishlist.filter(item => item.id !== id)); };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setTempWish(prev => ({ ...prev, image: reader.result })); }; reader.readAsDataURL(file); }
  };

  const addExpense = () => {
    if (!selectedDate || !tempExpense.amount) return;
    const newExpense = { id: Date.now(), date: formatDateKey(selectedDate), amount: Number(tempExpense.amount), title: tempExpense.title || '一般消費', category: tempExpense.category, method: tempExpense.method };
    setExpenses([...expenses, newExpense]);
    setTempExpense({ title: '', amount: '', category: 'food', method: 'cash' });
  };

  const deleteExpense = (id) => { setExpenses(expenses.filter(e => e.id !== id)); };
  const exportData = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "TYPE,DATE,AMOUNT,DETAILS,CATEGORY,METHOD\n";
    Object.entries(savings).forEach(([date, amount]) => { csvContent += `SAVING,${date},${amount},Daily Saving,,\n`; });
    expenses.forEach(e => { csvContent += `EXPENSE,${e.date},${e.amount},${e.title},${e.category},${e.method}\n`; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bear365_Data_${formatDateKey(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRandomVerse = () => { const randomIndex = Math.floor(Math.random() * BIBLE_VERSES.length); setBibleVerse(BIBLE_VERSES[randomIndex]); };

  const renderCalendar = (type) => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    const todayStr = formatDateKey(new Date());

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const dateKey = formatDateKey(date);
      const isSaved = savings[dateKey];
      const hasExpense = expenses.some(e => e.date === dateKey);
      const isToday = dateKey === todayStr;
      
      // 優化日曆樣式：更柔和的背景與圓角
      let statusClass = "bg-[#F7F2EB] text-[#8D7666] hover:bg-[#E6D0BC]"; // 預設：奶油色背景
      
      if (type === 'savings') {
        if (isSaved) statusClass = "bg-[#8B5E3C] text-white shadow-md shadow-[#8B5E3C]/30"; // 存錢：深咖啡色
      } else {
        if (hasExpense) statusClass = "bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/30"; // 消費：焦糖色
      }

      if (isToday) {
        statusClass += " ring-2 ring-offset-2 ring-offset-[#FEFBF5] ring-[#BC6C25]"; // 今天：邊框強調
      }

      days.push(
        <button 
          key={i} 
          onClick={() => handleDateClick(i)}
          className={`aspect-square rounded-[18px] flex flex-col items-center justify-center text-sm font-bold transition-all duration-300 ${statusClass}`}
        >
          <span>{i}</span>
          {type === 'savings' && isSaved && <span className="text-[9px] mt-0.5 opacity-90">🐻</span>}
          {type === 'expenses' && hasExpense && (
             <div className="w-1.5 h-1.5 rounded-full bg-white mt-1 shadow-sm"></div>
          )}
        </button>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-3 mb-6 px-2">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-[#B09E90] py-2">{d}</div>
        ))}
        {days}
      </div>
    );
  };

  return (
    // 背景改為溫暖的米色
    <div className="min-h-screen bg-[#FEFBF5] text-[#433422] font-sans selection:bg-[#E6D0BC] selection:text-[#433422] pb-24">
      
      {/* Top Header */}
      <div className="pt-12 pb-8 px-6 bg-[#FFF8E7] rounded-b-[48px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 border-b border-[#F3E5D8]">
        <div className="flex justify-between items-center mb-6">
           <div className="flex flex-col">
              <h1 className="text-4xl font-black tracking-tight text-[#6F4E37] flex items-center gap-2 drop-shadow-sm">
                <span>🐻</span> 365
              </h1>
              <p className="text-xs text-[#9C826B] mt-2 font-medium tracking-wide">매일 조금씩, 꿈을 향해 나아갑니다</p>
           </div>
           {user ? (
             <div className="flex items-center gap-2 bg-[#FDFBF7] px-2 py-1 rounded-full shadow-sm border border-[#E6DCC3]">
               <span className="text-[10px] text-[#9C826B] font-bold px-2">
                 {user.isAnonymous ? 'Guest' : 'User'}
               </span>
               <img src={user.photoURL || "https://ui-avatars.com/api/?name=Bear&background=random&color=6F4E37"} alt="User" className="w-8 h-8 rounded-full border border-[#E6DCC3]" />
             </div>
           ) : (
             <div className="text-xs text-[#9C826B]">Loading...</div>
           )}
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between bg-[#FDFBF7] p-2 rounded-[24px] shadow-sm border border-[#E6DCC3]">
          <button onClick={() => changeMonth(-1)} className="p-2.5 hover:bg-[#F3E5D8] rounded-full transition text-[#8D7666]">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
             <span className="text-lg font-bold text-[#5D4037] tracking-tight">
               {currentYear}년 {currentMonth + 1}월
             </span>
             <button 
                onClick={goToToday}
                className="ml-1 px-4 py-1.5 bg-[#6F4E37] text-[#FFF8E7] text-[10px] font-bold rounded-full hover:bg-[#5D4037] transition shadow-md shadow-[#6F4E37]/20"
             >
                TODAY
             </button>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2.5 hover:bg-[#F3E5D8] rounded-full transition text-[#8D7666]">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-6">
        
        {/* === SAVINGS VIEW === */}
        {activeTab === 'savings' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Progress Card */}
            <div className="bg-[#FFF] p-7 rounded-[40px] shadow-[0_10px_40px_-10px_rgba(111,78,55,0.1)] border border-[#F3E5D8] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFF8E7] rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl opacity-50 pointer-events-none"></div>
              
              <div className="flex justify-between items-end mb-5 relative z-10">
                <div>
                  <label className="text-[10px] font-bold text-[#B09E90] uppercase tracking-widest block mb-2">
                    연간 목표 (Annual Goal)
                  </label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#6F4E37]">{formatCurrency(yearSavings, currency)}</span>
                    <div className="flex items-center text-[#B09E90] font-medium">
                      <span className="mx-1">/</span>
                      <input 
                        type="number" 
                        value={goal} 
                        onChange={(e) => setGoal(Number(e.target.value))}
                        className="text-lg bg-transparent border-b border-[#E6DCC3] w-24 focus:outline-none focus:border-[#6F4E37] text-right font-bold text-[#9C826B] placeholder-[#DCCAC0]"
                      />
                    </div>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-full bg-[#F3E5D8] flex items-center justify-center text-[#6F4E37] font-black text-sm shadow-inner">
                  {Math.round(progressPercentage)}%
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-4 bg-[#F7F2EB] rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-[#D4A373] to-[#8B5E3C] rounded-full transition-all duration-1000 ease-out shadow-[0_2px_10px_rgba(139,94,60,0.3)]"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-center text-xs text-[#9C826B] mt-4 font-medium">
                 ✨ 목표에 더 가까워졌습니다! 화이팅!
              </p>
            </div>

            {/* Wishlist Link Button */}
            <div className="flex items-center justify-between bg-white p-5 rounded-[32px] shadow-sm cursor-pointer hover:shadow-md hover:bg-[#FAFAF5] transition border border-[#F3E5D8] group" onClick={() => setActiveTab('wishlist')}>
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-[#FFE5D9] text-[#E07A5F] rounded-2xl group-hover:scale-110 transition">
                   <Heart size={20} fill="currentColor" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-[#5D4037]">나의 위시리스트 (My Wishlist)</p>
                   <p className="text-xs text-[#9C826B] mt-0.5">總金額: {wishlistTotal.toLocaleString()}</p>
                 </div>
               </div>
               <ChevronRight size={20} className="text-[#DCCAC0]" />
            </div>

            {/* Calendar */}
            <div className="bg-white p-6 rounded-[40px] shadow-sm border border-[#F3E5D8]">
               <div className="flex justify-between items-center mb-6 px-2">
                 <h3 className="font-bold text-[#5D4037] flex items-center gap-2">
                   <CalendarIcon size={18} className="text-[#8B5E3C]"/>
                   儲蓄計劃 (저축 계획)
                 </h3>
               </div>
               {renderCalendar('savings')}
            </div>

            {/* Bible Verse */}
            <div className="mt-8 text-center px-6 relative">
               <div className="w-12 h-1.5 bg-[#E6DCC3] rounded-full mx-auto mb-6 opacity-50"></div>
               <p className="text-sm text-[#6F4E37] leading-relaxed font-medium tracking-wide">
                 "{bibleVerse.text}"
               </p>
               <p className="text-[10px] text-[#9C826B] mt-3 uppercase tracking-widest font-bold">
                 — {bibleVerse.ref} —
               </p>
               <button 
                 onClick={getRandomVerse} 
                 className="mt-5 p-3 bg-white rounded-full shadow-sm text-[#B09E90] hover:text-[#8B5E3C] hover:bg-[#FFF8E7] transition border border-[#F3E5D8]"
               >
                 <RefreshCw size={16} />
               </button>
            </div>
          </div>
        )}

        {/* === WISHLIST VIEW === */}
        {activeTab === 'wishlist' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20 space-y-6">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-2xl font-black text-[#5D4037]">위시리스트 <span className="text-sm font-medium text-[#9C826B] block mt-1">願望清單</span></h2>
              <div className="text-right">
                 <p className="text-[10px] font-bold text-[#B09E90] uppercase tracking-wider">Total</p>
                 <p className="text-xl font-black text-[#6F4E37]">{wishlistTotal.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               {wishlist.length === 0 && (
                 <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-[#E6DCC3]">
                   <p className="text-[#B09E90] font-medium">目前沒有願望 (아직 소원이 없습니다)</p>
                 </div>
               )}
               {wishlist.map(item => (
                 <div key={item.id} className="bg-white p-4 rounded-[32px] shadow-sm flex gap-5 items-center border border-[#F3E5D8]">
                    <div className="w-20 h-20 bg-[#F7F2EB] rounded-2xl flex-shrink-0 overflow-hidden shadow-inner">
                       {item.image ? (
                         <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-[#DCCAC0]">
                           <Camera size={24} />
                         </div>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h3 className="font-bold text-[#5D4037] truncate">{item.name}</h3>
                       <p className="text-[#8B5E3C] font-black mt-1">{formatCurrency(item.price, currency)}</p>
                       <div className="flex justify-between items-center mt-3">
                         <span className="text-[10px] bg-[#FFF8E7] px-2.5 py-1 rounded-lg text-[#9C826B] font-bold border border-[#F3E5D8] truncate max-w-[100px]">{item.platform || 'General'}</span>
                         <button onClick={() => deleteWishItem(item.id)} className="text-[#DCCAC0] hover:text-[#D08C8C] transition p-1">
                           <Trash2 size={18} />
                         </button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            <button 
              onClick={() => setShowWishlistModal(true)}
              className="fixed bottom-28 right-6 w-14 h-14 bg-[#4A3B32] text-[#FFF8E7] rounded-full flex items-center justify-center shadow-lg hover:bg-[#3E2F28] hover:scale-105 transition active:scale-95 z-40 border-2 border-[#6F4E37]"
            >
              <Plus size={28} />
            </button>
          </div>
        )}

        {/* === EXPENSE VIEW === */}
        {activeTab === 'expenses' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
             <div className="bg-white p-6 rounded-[40px] shadow-sm border border-[#F3E5D8]">
                <h2 className="text-lg font-bold text-[#5D4037] mb-6 px-2 flex items-center gap-2">
                  <Coffee size={18} className="text-[#8B5E3C]" />
                  消費紀錄 (소비 기록)
                </h2>
                {renderCalendar('expenses')}
                
                {/* Stats */}
                <div className="mt-8 pt-8 border-t border-[#F3E5D8]">
                  <h3 className="text-xs font-bold text-[#9C826B] mb-6 text-center uppercase tracking-widest">
                    本月統計 (이번 달 통계)
                  </h3>
                  
                  <div className="flex flex-col gap-8">
                    {/* Category Chart */}
                    <div className="text-center">
                       <SimplePieChart data={expenseCategoryData} />
                       <div className="flex flex-wrap justify-center gap-2 mt-6">
                         {expenseCategoryData.map(d => (
                           <div key={d.name} className="flex items-center gap-2 bg-[#FAFAF5] pl-1.5 pr-3 py-1.5 rounded-xl border border-[#F3E5D8]">
                             <div className="w-3 h-3 rounded-full" style={{background: d.color}}></div>
                             <span className="text-[10px] font-bold text-[#6F4E37]">{d.name.split(' ')[0]}</span>
                           </div>
                         ))}
                       </div>
                    </div>

                    {/* Method Chart */}
                    <div className="bg-[#FFF8E7] p-5 rounded-[24px] border border-[#E6DCC3]">
                       <h4 className="text-[10px] font-bold text-[#9C826B] mb-4 uppercase">付款方式 (결제 수단)</h4>
                       {expenseMethodData.map(d => (
                         <div key={d.name} className="flex justify-between items-center text-xs mb-3 last:mb-0">
                           <span className="text-[#6F4E37] font-medium flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full" style={{background: d.color}}></div>
                             {d.name}
                           </span>
                           <span className="font-bold text-[#433422]">{formatCurrency(d.value, currency)}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* === SETTINGS VIEW === */}
        {activeTab === 'settings' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-[#5D4037] mb-6 px-2">設定 (설정)</h2>
            
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-[#F3E5D8] divide-y divide-[#F7F2EB]">
               {/* Currency */}
               <div className="p-6 flex justify-between items-center">
                 <span className="text-[#5D4037] font-bold">貨幣選擇 (통화 선택)</span>
                 <select 
                   value={currency} 
                   onChange={(e) => setCurrency(e.target.value)}
                   className="bg-[#F7F2EB] border-none rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#8B5E3C] text-[#6F4E37] font-bold cursor-pointer"
                 >
                   <option value="TWD">TWD (台幣)</option>
                   <option value="KRW">KRW (韓元)</option>
                   <option value="JPY">JPY (日幣)</option>
                   <option value="USD">USD (美金)</option>
                   <option value="CNY">CNY (人民幣)</option>
                 </select>
               </div>

               {/* Data Import/Export */}
               <div className="p-6">
                 <span className="text-[#5D4037] font-bold block mb-4">數據匯入與匯出 (Excel CSV)</span>
                 <div className="flex gap-4">
                    <button onClick={exportData} className="flex-1 flex items-center justify-center gap-2 bg-[#6F4E37] text-[#FFF8E7] py-3.5 rounded-2xl text-sm font-bold hover:bg-[#5D4037] transition shadow-md shadow-[#6F4E37]/20">
                      <Download size={18} />
                      匯出
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-2 bg-[#F3E5D8] text-[#6F4E37] py-3.5 rounded-2xl text-sm font-bold hover:bg-[#E6D0BC] transition cursor-pointer border border-[#E6DCC3]">
                      <Upload size={18} />
                      匯入
                      <input type="file" className="hidden" accept=".csv" />
                    </label>
                 </div>
                 <p className="text-[10px] text-[#B09E90] mt-3 text-center">
                   * 匯出的檔案可直接使用 Excel 開啟編輯
                 </p>
               </div>

               {/* Account */}
               <div className="p-6">
                 <span className="text-[#5D4037] font-bold block mb-4">帳號 (계정)</span>
                 {user ? (
                   <div className="space-y-4">
                     <div className="flex items-center justify-between bg-[#FAFAF5] p-3 rounded-2xl border border-[#F3E5D8]">
                       <div className="flex items-center gap-3">
                          <img src={user.photoURL || "https://ui-avatars.com/api/?name=Bear&background=random"} alt="User" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                          <div>
                            <p className="text-sm font-bold text-[#5D4037]">{user.isAnonymous ? 'Guest User' : user.displayName}</p>
                            <p className="text-xs text-[#9C826B]">{user.isAnonymous ? 'Preview Mode' : user.email}</p>
                          </div>
                       </div>
                       <button onClick={handleLogout} className="p-2.5 bg-[#FFF0F0] text-[#D08C8C] rounded-full hover:bg-[#FFE5E5] transition">
                         <LogOut size={18} />
                       </button>
                     </div>
                     {user.isAnonymous && (
                       <div className="bg-[#FFF8E7] border border-[#E6DCC3] rounded-2xl p-4 text-xs text-[#8B5E3C] flex items-start gap-3 leading-relaxed">
                         <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                         目前為訪客模式。請登入 Google 帳號以確保資料永久保存。
                       </div>
                     )}
                   </div>
                 ) : (
                   <button onClick={handleGoogleLogin} className="w-full bg-[#4285F4] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-[#3367D6] transition shadow-md">
                     Google 帳號登入
                   </button>
                 )}
               </div>
            </div>
          </div>
        )}

      </div>

      {/* --- BOTTOM NAVIGATION --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FEFBF5]/90 backdrop-blur-xl border-t border-[#E6DCC3] px-6 pb-8 pt-3 z-40 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex-1">
             <TabButton 
               active={activeTab === 'savings'} 
               onClick={() => setActiveTab('savings')} 
               icon={CalendarIcon} 
               label="儲蓄" 
             />
          </div>
          <div className="flex-1">
             <TabButton 
               active={activeTab === 'wishlist'} 
               onClick={() => setActiveTab('wishlist')} 
               icon={Heart} 
               label="願望" 
             />
          </div>
          <div className="flex-1">
             <TabButton 
               active={activeTab === 'expenses'} 
               onClick={() => setActiveTab('expenses')} 
               icon={PieChart} 
               label="消費" 
             />
          </div>
          <div className="flex-1">
             <TabButton 
               active={activeTab === 'settings'} 
               onClick={() => setActiveTab('settings')} 
               icon={Settings} 
               label="設定" 
             />
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Savings Modal */}
      <Modal 
        isOpen={showSavingsModal} 
        onClose={() => setShowSavingsModal(false)}
        title={`${selectedDate?.getMonth()+1}월 ${selectedDate?.getDate()}일 儲蓄`}
      >
        <div className="text-center">
          <p className="text-[#9C826B] mb-8 font-medium">今日要存錢嗎？ (오늘 저축하시겠습니까?)</p>
          <div className="relative mb-8">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#B09E90] font-bold text-xl">₩</span>
            <input 
              type="number" 
              placeholder="0" 
              value={tempAmount}
              onChange={(e) => setTempAmount(e.target.value)}
              className="w-full bg-[#F7F2EB] rounded-[24px] py-6 pl-12 pr-12 text-3xl font-black text-[#5D4037] outline-none focus:ring-4 focus:ring-[#E6DCC3] transition text-center placeholder-[#DCCAC0]"
              autoFocus
            />
            {tempAmount && (
               <button onClick={() => setTempAmount('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#DCCAC0] hover:text-[#9C826B]">
                 <X size={24} />
               </button>
            )}
          </div>
          <button 
            onClick={saveMoney}
            className="w-full bg-[#8B5E3C] text-[#FFF8E7] py-5 rounded-[24px] font-black text-lg hover:bg-[#6F4E37] hover:shadow-lg hover:-translate-y-0.5 transition shadow-md shadow-[#8B5E3C]/30"
          >
            確定存錢 (저축하기)
          </button>
        </div>
      </Modal>

      {/* 2. Wishlist Modal */}
      <Modal
        isOpen={showWishlistModal}
        onClose={() => setShowWishlistModal(false)}
        title="新增願望 (위시리스트 추가)"
      >
        <div className="space-y-5">
           {/* Image Upload */}
           <div className="flex justify-center">
              <label className="w-28 h-28 bg-[#F7F2EB] rounded-[24px] flex flex-col items-center justify-center cursor-pointer hover:bg-[#E6DCC3] transition border-2 border-dashed border-[#DCCAC0] overflow-hidden relative group">
                 {tempWish.image ? (
                   <img src={tempWish.image} alt="Preview" className="w-full h-full object-cover" />
                 ) : (
                   <>
                     <Camera size={28} className="text-[#B09E90] mb-1 group-hover:scale-110 transition" />
                     <span className="text-[10px] text-[#9C826B] font-bold">Photo</span>
                   </>
                 )}
                 <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
           </div>
           
           <input 
             type="text" placeholder="品名 (상품명)" 
             value={tempWish.name} onChange={e => setTempWish({...tempWish, name: e.target.value})}
             className="w-full p-4 bg-[#F7F2EB] rounded-2xl outline-none text-[#5D4037] font-bold placeholder-[#B09E90] focus:ring-2 focus:ring-[#E6DCC3] transition"
           />
           <div className="relative">
             <input 
               type="number" placeholder="金額 (금액)" 
               value={tempWish.price} onChange={e => setTempWish({...tempWish, price: e.target.value})}
               className="w-full p-4 bg-[#F7F2EB] rounded-2xl outline-none text-[#5D4037] font-bold placeholder-[#B09E90] focus:ring-2 focus:ring-[#E6DCC3] transition"
             />
             {tempWish.price && <button onClick={() => setTempWish({...tempWish, price: ''})} className="absolute right-4 top-4 text-[#DCCAC0]"><X size={18}/></button>}
           </div>
           <input 
             type="text" placeholder="購買平台 (구매처)" 
             value={tempWish.platform} onChange={e => setTempWish({...tempWish, platform: e.target.value})}
             className="w-full p-4 bg-[#F7F2EB] rounded-2xl outline-none text-[#5D4037] font-bold placeholder-[#B09E90] focus:ring-2 focus:ring-[#E6DCC3] transition"
           />
           <button onClick={addWishItem} className="w-full bg-[#4A3B32] text-[#FFF8E7] py-4 rounded-2xl font-bold mt-2 shadow-md shadow-[#4A3B32]/20 hover:bg-[#3E2F28] transition">
             新增 (추가)
           </button>
        </div>
      </Modal>

      {/* 3. Expense Day Detail Modal (List + Add) */}
      <Modal
        isOpen={showDayDetailModal}
        onClose={() => setShowDayDetailModal(false)}
        title={`${selectedDate?.getMonth()+1}월 ${selectedDate?.getDate()}일 消費 (소비)`}
      >
        {/* List of items for this day */}
        <div className="mb-8 space-y-3">
           {dailyExpenses.length === 0 ? (
             <p className="text-center text-[#B09E90] text-sm py-6 bg-[#F7F2EB] rounded-2xl border border-dashed border-[#E6DCC3]">無消費紀錄 (기록 없음)</p>
           ) : (
             dailyExpenses.map(item => (
               <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-[#F3E5D8]">
                 <div className="flex items-center gap-4">
                    <div className="w-2 h-8 rounded-full" style={{ background: EXPENSE_CATEGORIES.find(c => c.id === item.category)?.color }}></div>
                    <div>
                      <p className="font-bold text-[#5D4037] text-sm">{item.title}</p>
                      <p className="text-[10px] text-[#9C826B] font-medium mt-0.5">{EXPENSE_CATEGORIES.find(c => c.id === item.category)?.label}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <span className="font-black text-[#5D4037]">{formatCurrency(item.amount, currency)}</span>
                   <button onClick={() => deleteExpense(item.id)} className="text-[#DCCAC0] hover:text-[#D08C8C] transition"><Trash2 size={16} /></button>
                 </div>
               </div>
             ))
           )}
        </div>

        {/* Add New Form */}
        <div className="pt-6 border-t border-[#E6DCC3]">
           <h4 className="text-xs font-black text-[#B09E90] mb-4 uppercase tracking-wider">新增紀錄 (기록 추가)</h4>
           <div className="space-y-4">
              <input 
                 type="text" placeholder="品名 (내용)" 
                 value={tempExpense.title} onChange={e => setTempExpense({...tempExpense, title: e.target.value})}
                 className="w-full p-3.5 bg-[#F7F2EB] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E6DCC3] font-bold text-[#5D4037] placeholder-[#B09E90]"
              />
              <div className="relative">
                <input 
                   type="number" placeholder="金額 (금액)" 
                   value={tempExpense.amount} onChange={e => setTempExpense({...tempExpense, amount: e.target.value})}
                   className="w-full p-3.5 bg-[#F7F2EB] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E6DCC3] font-bold text-[#5D4037] placeholder-[#B09E90]"
                />
                 {tempExpense.amount && <button onClick={() => setTempExpense({...tempExpense, amount: ''})} className="absolute right-4 top-3.5 text-[#DCCAC0]"><X size={16}/></button>}
              </div>

              {/* Category Select */}
              <div className="grid grid-cols-5 gap-2">
                {EXPENSE_CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setTempExpense({...tempExpense, category: cat.id})}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition ${
                      tempExpense.category === cat.id ? 'bg-[#5D4037] text-[#FFF8E7] border-[#5D4037] shadow-md' : 'bg-white border-[#F3E5D8] text-[#9C826B] hover:bg-[#FFF8E7]'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full mb-1.5 ${tempExpense.category === cat.id ? 'ring-2 ring-white/30' : ''}`} style={{background: cat.color}}></div>
                    <span className="text-[9px] font-bold whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{cat.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              
              {/* Method Select */}
              <div className="flex gap-3">
                 {PAYMENT_METHODS.map(method => (
                   <button
                     key={method.id}
                     onClick={() => setTempExpense({...tempExpense, method: method.id})}
                     className={`flex-1 py-3 rounded-xl text-xs font-bold transition border ${
                       tempExpense.method === method.id 
                       ? 'bg-[#E6D0BC] text-[#5D4037] border-[#D4A373]' 
                       : 'bg-[#F7F2EB] text-[#9C826B] border-transparent hover:bg-[#E6D0BC]/50'
                     }`}
                   >
                     {method.label}
                   </button>
                 ))}
              </div>

              <button onClick={addExpense} className="w-full bg-[#4A3B32] text-[#FFF8E7] py-4 rounded-xl font-bold text-sm hover:bg-[#3E2F28] transition shadow-md shadow-[#4A3B32]/20 mt-2">
                加入 (추가)
              </button>
           </div>
        </div>
      </Modal>

    </div>
  );
}
