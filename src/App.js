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
  AlertCircle
} from 'lucide-react';

// --- Firebase Configuration ---
// 【修復步驟】：請不要整段覆蓋！
// 請「只」把雙引號 "" 裡面的內容，換成您 Firebase 的資料。
const firebaseConfig = {
  apiKey: "AIzaSyCOX0pW4-QlHxwBN79yFrCkHhF4RClnRUg",
  authDomain: "bear365-e29e0.firebaseapp.com",
  projectId: "bear365-e29e0",
  storageBucket: "bear365-e29e0.firebasestorage.app",
  messagingSenderId: "437697858004",
  appId: "1:437697858004:web:bde1d75d18232ba1c56e41",
  measurementId: "G-QYY8JFLL7J" 
};

// Initialize Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase 初始化失敗", e);
}

// App ID
const appId = "bear-365-app";

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

const EXPENSE_CATEGORIES = [
  { id: 'food', label: '飲食 (식사)', color: '#D97706' }, // amber-600
  { id: 'transport', label: '交通 (교통)', color: '#059669' }, // emerald-600
  { id: 'medical', label: '醫療 (의료)', color: '#DC2626' }, // red-600
  { id: 'entertainment', label: '娛樂 (오락)', color: '#7C3AED' }, // violet-600
  { id: 'other', label: '其他 (기타)', color: '#6B7280' }, // gray-500
];

const PAYMENT_METHODS = [
  { id: 'cash', label: '現金 (현금)', color: '#3B82F6' }, // blue-500
  { id: 'card', label: '刷卡 (카드)', color: '#EC4899' }, // pink-500
];

// --- Sub-Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-stone-100">
          <h3 className="text-lg font-bold text-stone-800">{title}</h3>
          <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition">
            <X size={18} className="text-stone-600" />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const SimplePieChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  
  if (total === 0) return (
    <div className="flex items-center justify-center h-48 w-48 rounded-full bg-stone-100 mx-auto border-4 border-stone-50">
      <span className="text-xs text-stone-400">No Data</span>
    </div>
  );

  return (
    <div className="relative h-48 w-48 mx-auto my-4">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
        {data.map((item, index) => {
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
              stroke="white"
              strokeWidth="2"
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
      active ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'
    }`}
  >
    <div className={`p-1.5 rounded-2xl mb-1 transition-all ${active ? 'bg-stone-200' : 'bg-transparent'}`}>
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
  </button>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  // State
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('savings');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [currency, setCurrency] = useState('TWD');
  
  // Data State
  const [savings, setSavings] = useState({});
  const [goal, setGoal] = useState(100000);
  const [wishlist, setWishlist] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bibleVerse, setBibleVerse] = useState(BIBLE_VERSES[0]);

  // Modals
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);

  // Inputs
  const [tempAmount, setTempAmount] = useState('');
  const [tempExpense, setTempExpense] = useState({ title: '', amount: '', category: 'food', method: 'cash' });
  const [tempWish, setTempWish] = useState({ name: '', price: '', platform: '', image: '' });

  // --- Auth & Data Loading ---
  useEffect(() => {
    // 監聽登入狀態
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        // 如果未登入，嘗試匿名登入（為了能寫入資料庫）
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Anonymous auth failed", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Sync with Firestore
  useEffect(() => {
    if (!user || !db) return;

    // References to Firestore collections
    const savingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'savings');
    const expensesRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'expenses');
    const wishlistRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'wishlist');
    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'settings');

    // Load initial data
    const unsubSavings = onSnapshot(savingsRef, (doc) => {
      if (doc.exists()) setSavings(doc.data().data || {});
    }, (error) => console.log("Sync error savings:", error));

    const unsubExpenses = onSnapshot(expensesRef, (doc) => {
      if (doc.exists()) setExpenses(doc.data().data || []);
    }, (error) => console.log("Sync error expenses:", error));

    const unsubWishlist = onSnapshot(wishlistRef, (doc) => {
      if (doc.exists()) setWishlist(doc.data().data || []);
    }, (error) => console.log("Sync error wishlist:", error));

    const unsubSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.goal) setGoal(data.goal);
        if (data.currency) setCurrency(data.currency);
      }
    }, (error) => console.log("Sync error settings:", error));

    return () => {
      unsubSavings();
      unsubExpenses();
      unsubWishlist();
      unsubSettings();
    };
  }, [user]);

  // 3. Save Data to Firestore
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!user || !db) return;

    const saveData = async () => {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'savings'), { data: savings }, { merge: true });
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'expenses'), { data: expenses }, { merge: true });
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'wishlist'), { data: wishlist }, { merge: true });
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'settings'), { goal, currency }, { merge: true });
      } catch (e) {
        console.error("Error saving data:", e);
      }
    };

    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [savings, expenses, wishlist, goal, currency, user]);


  // --- Computed ---
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const yearSavings = useMemo(() => {
    return Object.entries(savings).reduce((acc, [dateStr, amount]) => {
      if (dateStr.startsWith(currentYear.toString())) {
        return acc + Number(amount);
      }
      return acc;
    }, 0);
  }, [savings, currentYear]);

  const progressPercentage = Math.min(100, Math.max(0, (yearSavings / goal) * 100));

  const wishlistTotal = useMemo(() => {
    return wishlist.reduce((acc, item) => acc + Number(item.price), 0);
  }, [wishlist]);

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

  // --- Actions ---

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      alert("登入失敗，請檢查 Firebase Console 的 Authentication 設定是否已啟用 Google 登入。");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentYear, currentMonth + delta, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  function formatDateKey(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const handleDateClick = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    setSelectedDate(date);
    setTempAmount(savings[formatDateKey(date)] || ''); 
    
    if (activeTab === 'savings') {
      setShowSavingsModal(true);
    } else if (activeTab === 'expenses') {
      setShowDayDetailModal(true);
    }
  };

  const saveMoney = () => {
    if (!selectedDate) return;
    const key = formatDateKey(selectedDate);
    if (tempAmount === '') {
        const newSavings = { ...savings };
        delete newSavings[key];
        setSavings(newSavings);
    } else {
        setSavings(prev => ({ ...prev, [key]: Number(tempAmount) }));
    }
    setShowSavingsModal(false);
  };

  const addWishItem = () => {
    if (!tempWish.name || !tempWish.price) return;
    const newItem = {
      id: Date.now(),
      ...tempWish,
      price: Number(tempWish.price)
    };
    setWishlist([...wishlist, newItem]);
    setTempWish({ name: '', price: '', platform: '', image: '' });
    setShowWishlistModal(false);
  };

  const deleteWishItem = (id) => {
    setWishlist(wishlist.filter(item => item.id !== id));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempWish(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addExpense = () => {
    if (!selectedDate || !tempExpense.amount) return;
    const newExpense = {
      id: Date.now(),
      date: formatDateKey(selectedDate),
      amount: Number(tempExpense.amount),
      title: tempExpense.title || '一般消費',
      category: tempExpense.category,
      method: tempExpense.method
    };
    setExpenses([...expenses, newExpense]);
    setTempExpense({ title: '', amount: '', category: 'food', method: 'cash' });
  };

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const exportData = () => {
    const data = {
      savings,
      expenses,
      wishlist,
      goal,
      currency
    };
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "TYPE,DATE,AMOUNT,DETAILS,CATEGORY,METHOD\n";
    
    Object.entries(savings).forEach(([date, amount]) => {
      csvContent += `SAVING,${date},${amount},Daily Saving,,\n`;
    });
    
    expenses.forEach(e => {
      csvContent += `EXPENSE,${e.date},${e.amount},${e.title},${e.category},${e.method}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bear365_Data_${formatDateKey(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRandomVerse = () => {
    const randomIndex = Math.floor(Math.random() * BIBLE_VERSES.length);
    setBibleVerse(BIBLE_VERSES[randomIndex]);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-[#F5F5F0] text-stone-800 font-sans selection:bg-amber-200">
      
      {/* Top Header */}
      <div className="pt-12 pb-6 px-6 bg-white rounded-b-[40px] shadow-sm relative z-10">
        <div className="flex justify-between items-center mb-6">
           <div className="flex flex-col">
              <h1 className="text-4xl font-extrabold tracking-tight text-amber-900 flex items-center gap-2">
                <span>🐻</span> 365
              </h1>
              <p className="text-xs text-stone-400 mt-2 font-light">매일 조금씩, 꿈을 향해 나아갑니다</p>
           </div>
           {user ? (
             <div className="flex items-center gap-2">
               {user.isAnonymous && <span className="text-[10px] bg-stone-100 text-stone-400 px-2 py-1 rounded-full">Guest</span>}
               <img src={user.photoURL || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="w-10 h-10 rounded-full border-2 border-amber-100" />
             </div>
           ) : (
             <div className="text-xs text-stone-400">Loading...</div>
           )}
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between bg-stone-50 p-2 rounded-3xl">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full transition shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
             <span className="text-lg font-bold text-stone-700">
               {currentYear}년 {currentMonth + 1}월
             </span>
             <button 
                onClick={goToToday}
                className="ml-2 px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full hover:bg-amber-200 transition"
             >
                TODAY
             </button>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full transition shadow-sm">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 pb-24 max-w-lg mx-auto">
        
        {/* === SAVINGS VIEW === */}
        {activeTab === 'savings' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            {/* Progress Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 border border-white">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    연간 목표 (Annual Goal)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-stone-800">{formatCurrency(yearSavings, currency)}</span>
                    <span className="text-stone-300">/</span>
                    <input 
                      type="number" 
                      value={goal} 
                      onChange={(e) => setGoal(Number(e.target.value))}
                      className="text-lg text-stone-400 bg-transparent border-b border-stone-200 w-24 focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-xs">
                  {Math.round(progressPercentage)}%
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-center text-xs text-stone-500 mt-3">
                 연간 목표 (연간 목표)中距離目標更近了！加油！ (목표에 더 가까워졌습니다! 화이팅!)
              </p>
            </div>

            {/* Wishlist Link Button */}
            <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm cursor-pointer hover:bg-stone-50 transition" onClick={() => setActiveTab('wishlist')}>
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-pink-100 text-pink-500 rounded-full">
                   <Heart size={18} fill="currentColor" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-stone-700">나의 위시리스트 (My Wishlist)</p>
                   <p className="text-xs text-stone-400">總金額: {wishlistTotal.toLocaleString()}</p>
                 </div>
               </div>
               <ChevronRight size={18} className="text-stone-300" />
            </div>

            {/* Calendar */}
            <div className="bg-white p-5 rounded-[32px] shadow-sm">
               <div className="flex justify-between items-center mb-4 px-2">
                 <h3 className="font-bold text-stone-700">儲蓄計劃 (저축 계획)</h3>
               </div>
               {renderCalendar('savings')}
            </div>

            {/* Bible Verse */}
            <div className="mt-8 text-center px-4 relative">
               <div className="w-8 h-1 bg-stone-200 rounded-full mx-auto mb-4"></div>
               <p className="text-sm text-stone-600 leading-relaxed font-serif tracking-wide">
                 {bibleVerse.text}
               </p>
               <p className="text-[10px] text-stone-400 mt-2 uppercase tracking-widest">
                 {bibleVerse.ref}
               </p>
               <button 
                 onClick={getRandomVerse} 
                 className="mt-4 p-2 bg-white rounded-full shadow-sm text-stone-400 hover:text-amber-600 transition"
               >
                 <RefreshCw size={14} />
               </button>
            </div>
          </div>
        )}

        {/* === WISHLIST VIEW === */}
        {activeTab === 'wishlist' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-stone-800">위시리스트 <span className="text-sm font-normal text-stone-400 block mt-1">願望清單</span></h2>
              <div className="text-right">
                 <p className="text-xs text-stone-400">總金額</p>
                 <p className="text-xl font-bold text-stone-800">{wishlistTotal.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               {wishlist.length === 0 && (
                 <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-stone-100">
                   <p className="text-stone-300">目前沒有願望 (아직 소원이 없습니다)</p>
                 </div>
               )}
               {wishlist.map(item => (
                 <div key={item.id} className="bg-white p-4 rounded-3xl shadow-sm flex gap-4 items-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-2xl flex-shrink-0 overflow-hidden">
                       {item.image ? (
                         <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-stone-300">
                           <Camera size={20} />
                         </div>
                       )}
                    </div>
                    <div className="flex-1">
                       <h3 className="font-bold text-stone-800">{item.name}</h3>
                       <p className="text-amber-600 font-bold mt-1">{formatCurrency(item.price, currency)}</p>
                       <div className="flex justify-between items-center mt-2">
                         <span className="text-[10px] bg-stone-100 px-2 py-1 rounded-md text-stone-500">{item.platform || 'General'}</span>
                         <button onClick={() => deleteWishItem(item.id)} className="text-stone-300 hover:text-red-400">
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            <button 
              onClick={() => setShowWishlistModal(true)}
              className="fixed bottom-24 right-6 w-14 h-14 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition active:scale-95 z-40"
            >
              <Plus size={28} />
            </button>
          </div>
        )}

        {/* === EXPENSE VIEW === */}
        {activeTab === 'expenses' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-6 rounded-[32px] shadow-sm mb-6">
                <h2 className="text-lg font-bold text-stone-800 mb-4">消費紀錄 (소비 기록)</h2>
                {/* Calendar */}
                {renderCalendar('expenses')}
                
                {/* Stats */}
                <div className="mt-8 pt-6 border-t border-stone-100">
                  <h3 className="text-sm font-bold text-stone-600 mb-4 text-center">本月統計 (이번 달 통계)</h3>
                  
                  <div className="flex flex-col gap-8">
                    {/* Category Chart */}
                    <div className="text-center">
                       <SimplePieChart data={expenseCategoryData} />
                       <div className="flex flex-wrap justify-center gap-2 mt-4">
                         {expenseCategoryData.map(d => (
                           <div key={d.name} className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-lg">
                             <div className="w-2 h-2 rounded-full" style={{background: d.color}}></div>
                             <span className="text-[10px] text-stone-500">{d.name}</span>
                           </div>
                         ))}
                       </div>
                    </div>

                    {/* Method Chart */}
                    <div className="bg-stone-50 p-4 rounded-2xl">
                       <h4 className="text-xs font-bold text-stone-500 mb-2">付款方式 (결제 수단)</h4>
                       {expenseMethodData.map(d => (
                         <div key={d.name} className="flex justify-between items-center text-xs mb-2 last:mb-0">
                           <span className="text-stone-600 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full" style={{background: d.color}}></div>
                             {d.name}
                           </span>
                           <span className="font-bold">{formatCurrency(d.value, currency)}</span>
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
            <h2 className="text-2xl font-bold text-stone-800 mb-6 px-2">設定 (설정)</h2>
            
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm divide-y divide-stone-50">
               {/* Currency */}
               <div className="p-5 flex justify-between items-center">
                 <span className="text-stone-700 font-medium">貨幣選擇 (통화 선택)</span>
                 <select 
                   value={currency} 
                   onChange={(e) => setCurrency(e.target.value)}
                   className="bg-stone-100 border-none rounded-lg text-sm px-3 py-2 focus:ring-amber-500"
                 >
                   <option value="TWD">TWD (台幣)</option>
                   <option value="KRW">KRW (韓元)</option>
                   <option value="JPY">JPY (日幣)</option>
                   <option value="USD">USD (美金)</option>
                   <option value="CNY">CNY (人民幣)</option>
                 </select>
               </div>

               {/* Data Import/Export */}
               <div className="p-5">
                 <span className="text-stone-700 font-medium block mb-3">數據匯入與匯出 (Excel CSV)</span>
                 <div className="flex gap-3">
                    <button onClick={exportData} className="flex-1 flex items-center justify-center gap-2 bg-stone-800 text-white py-3 rounded-xl text-sm hover:bg-stone-700 transition">
                      <Download size={16} />
                      匯出
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-600 py-3 rounded-xl text-sm hover:bg-stone-200 transition cursor-pointer">
                      <Upload size={16} />
                      匯入
                      <input type="file" className="hidden" accept=".csv" />
                    </label>
                 </div>
                 <p className="text-[10px] text-stone-400 mt-2 text-center">
                   匯出的 CSV 檔案可直接使用 Excel 開啟。匯入請使用相同格式。
                 </p>
               </div>

               {/* Account */}
               <div className="p-5">
                 <span className="text-stone-700 font-medium block mb-3">帳號 (계정)</span>
                 {user ? (
                   <div className="space-y-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <img src={user.photoURL || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="text-sm font-bold">{user.isAnonymous ? 'Guest User' : user.displayName}</p>
                            <p className="text-xs text-stone-400">{user.isAnonymous ? 'Preview Mode' : user.email}</p>
                          </div>
                       </div>
                       <button onClick={handleLogout} className="p-2 bg-red-50 text-red-500 rounded-full">
                         <LogOut size={18} />
                       </button>
                     </div>
                     {user.isAnonymous && (
                       <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                         <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                         目前為訪客模式。請登入 Google 帳號以確保資料永久保存。
                       </div>
                     )}
                   </div>
                 ) : (
                   <button onClick={handleGoogleLogin} className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition">
                     Google 帳號登入
                   </button>
                 )}
               </div>
            </div>
          </div>
        )}

      </div>

      {/* --- BOTTOM NAVIGATION --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-200 px-6 pb-6 pt-2 z-40 rounded-t-[32px]">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex-1">
             <TabButton 
               active={activeTab === 'savings'} 
               onClick={() => setActiveTab('savings')} 
               icon={CalendarIcon} 
               label="儲蓄 (저축)" 
             />
          </div>
          <div className="flex-1">
             <TabButton 
               active={activeTab === 'wishlist'} 
               onClick={() => setActiveTab('wishlist')} 
               icon={Heart} 
               label="願望 (위시)" 
             />
          </div>
          <div className="flex-1">
             <TabButton 
               active={activeTab === 'expenses'} 
               onClick={() => setActiveTab('expenses')} 
               icon={PieChart} 
               label="消費 (소비)" 
             />
          </div>
          <div className="flex-1">
             <TabButton 
               active={activeTab === 'settings'} 
               onClick={() => setActiveTab('settings')} 
               icon={Settings} 
               label="設定 (설정)" 
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
          <p className="text-stone-500 mb-6">今日要存錢嗎？ (오늘 저축하시겠습니까?)</p>
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₩</span>
            <input 
              type="number" 
              placeholder="0" 
              value={tempAmount}
              onChange={(e) => setTempAmount(e.target.value)}
              className="w-full bg-stone-50 rounded-2xl py-4 pl-10 pr-12 text-2xl font-bold text-stone-800 outline-none focus:ring-2 focus:ring-amber-500 transition"
              autoFocus
            />
            {tempAmount && (
               <button onClick={() => setTempAmount('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
                 <X size={18} />
               </button>
            )}
          </div>
          <button 
            onClick={saveMoney}
            className="w-full bg-amber-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-amber-800 transition shadow-lg shadow-amber-200"
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
        <div className="space-y-4">
           {/* Image Upload */}
           <div className="flex justify-center">
              <label className="w-24 h-24 bg-stone-50 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100 transition border border-stone-200 overflow-hidden relative">
                 {tempWish.image ? (
                   <img src={tempWish.image} alt="Preview" className="w-full h-full object-cover" />
                 ) : (
                   <>
                     <Camera size={24} className="text-stone-300 mb-1" />
                     <span className="text-[10px] text-stone-400">Photo</span>
                   </>
                 )}
                 <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
           </div>
           
           <input 
             type="text" placeholder="品名 (상품명)" 
             value={tempWish.name} onChange={e => setTempWish({...tempWish, name: e.target.value})}
             className="w-full p-4 bg-stone-50 rounded-2xl outline-none"
           />
           <div className="relative">
             <input 
               type="number" placeholder="金額 (금액)" 
               value={tempWish.price} onChange={e => setTempWish({...tempWish, price: e.target.value})}
               className="w-full p-4 bg-stone-50 rounded-2xl outline-none"
             />
             {tempWish.price && <button onClick={() => setTempWish({...tempWish, price: ''})} className="absolute right-4 top-4 text-stone-300"><X size={16}/></button>}
           </div>
           <input 
             type="text" placeholder="購買平台 (구매처)" 
             value={tempWish.platform} onChange={e => setTempWish({...tempWish, platform: e.target.value})}
             className="w-full p-4 bg-stone-50 rounded-2xl outline-none"
           />
           <button onClick={addWishItem} className="w-full bg-stone-800 text-white py-4 rounded-2xl font-bold mt-2">
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
        <div className="mb-6 space-y-2">
           {dailyExpenses.length === 0 ? (
             <p className="text-center text-stone-400 text-sm py-4">無消費紀錄 (기록 없음)</p>
           ) : (
             dailyExpenses.map(item => (
               <div key={item.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full" style={{ background: EXPENSE_CATEGORIES.find(c => c.id === item.category)?.color }}></div>
                    <div>
                      <p className="font-bold text-stone-700 text-sm">{item.title}</p>
                      <p className="text-[10px] text-stone-400">{EXPENSE_CATEGORIES.find(c => c.id === item.category)?.label}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="font-bold text-stone-800">{formatCurrency(item.amount, currency)}</span>
                   <button onClick={() => deleteExpense(item.id)} className="text-stone-300 hover:text-red-400"><Trash2 size={14} /></button>
                 </div>
               </div>
             ))
           )}
        </div>

        {/* Add New Form */}
        <div className="pt-6 border-t border-stone-100">
           <h4 className="text-xs font-bold text-stone-400 mb-3 uppercase">新增紀錄 (기록 추가)</h4>
           <div className="space-y-3">
              <input 
                 type="text" placeholder="品名 (내용)" 
                 value={tempExpense.title} onChange={e => setTempExpense({...tempExpense, title: e.target.value})}
                 className="w-full p-3 bg-stone-50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-stone-200"
              />
              <div className="relative">
                <input 
                   type="number" placeholder="金額 (금액)" 
                   value={tempExpense.amount} onChange={e => setTempExpense({...tempExpense, amount: e.target.value})}
                   className="w-full p-3 bg-stone-50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-stone-200"
                />
                 {tempExpense.amount && <button onClick={() => setTempExpense({...tempExpense, amount: ''})} className="absolute right-3 top-3 text-stone-300"><X size={14}/></button>}
              </div>

              {/* Category Select */}
              <div className="grid grid-cols-5 gap-1">
                {EXPENSE_CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setTempExpense({...tempExpense, category: cat.id})}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition ${
                      tempExpense.category === cat.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-100 text-stone-400 hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full mb-1" style={{background: cat.color}}></div>
                    <span className="text-[9px] whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{cat.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              
              {/* Method Select */}
              <div className="flex gap-2">
                 {PAYMENT_METHODS.map(method => (
                   <button
                     key={method.id}
                     onClick={() => setTempExpense({...tempExpense, method: method.id})}
                     className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                       tempExpense.method === method.id 
                       ? 'bg-stone-200 text-stone-800' 
                       : 'bg-stone-50 text-stone-400'
                     }`}
                   >
                     {method.label}
                   </button>
                 ))}
              </div>

              <button onClick={addExpense} className="w-full bg-stone-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-stone-700">
                加入 (추가)
              </button>
           </div>
        </div>
      </Modal>

    </div>
  );
}
