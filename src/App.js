import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection,
  enableIndexedDbPersistence
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
  Coffee
} from 'lucide-react';

// --- Firebase Configuration ---
// 【重要】請將下方 apiKey 等內容替換成您在 Firebase Console 複製的資料
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
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("請填入")) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    // 嘗試啟用離線持久化 (讓資料在庫存在手機裡，不僅僅是雲端)
    try {
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('多個分頁開啟導致離線儲存失敗');
            } else if (err.code === 'unimplemented') {
                console.warn('瀏覽器不支援離線儲存');
            }
        });
    } catch(e) {
        // 忽略非關鍵錯誤
    }
  }
} catch (e) {
  console.error("Firebase 初始化失敗", e);
}

const appId = "bear-365-app";

// --- Bible Verses ---
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
  { id: 'food', label: '飲食 (식사)', color: '#D4A373' }, 
  { id: 'transport', label: '交通 (교통)', color: '#CCD5AE' }, 
  { id: 'medical', label: '醫療 (의료)', color: '#E9EDC9' }, 
  { id: 'entertainment', label: '娛樂 (오락)', color: '#FAEDCD' }, 
  { id: 'other', label: '其他 (기타)', color: '#A98467' }, 
];

const PAYMENT_METHODS = [
  { id: 'cash', label: '現金 (현금)', color: '#6F4E37' }, 
  { id: 'card', label: '刷卡 (카드)', color: '#B5838D' }, 
];

// --- Components ---
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
            <path key={item.name} d={pathData} fill={item.color} stroke="#FEFBF5" strokeWidth="3" />
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

// --- MAIN APP ---
export default function App() {
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

  // UI State
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  
  // Inputs
  const [tempAmount, setTempAmount] = useState('');
  const [tempExpense, setTempExpense] = useState({ title: '', amount: '', category: 'food', method: 'cash' });
  const [tempWish, setTempWish] = useState({ name: '', price: '', platform: '', image: '' });

  // Init Auth
  useEffect(() => {
    if (!auth) return;
    
    // 嘗試從 LocalStorage 恢復資料 (離線/未登入時的第一層防護)
    try {
        const localData = localStorage.getItem('bear365_backup');
        if (localData) {
            const parsed = JSON.parse(localData);
            setSavings(prev => Object.keys(prev).length === 0 ? (parsed.savings || {}) : prev);
            setExpenses(prev => prev.length === 0 ? (parsed.expenses || []) : prev);
            setWishlist(prev => prev.length === 0 ? (parsed.wishlist || []) : prev);
            setGoal(prev => prev === 100000 ? (parsed.goal || 100000) : prev);
            setCurrency(prev => prev === 'TWD' ? (parsed.currency || 'TWD') : prev);
        }
    } catch (e) { console.error("Local load error", e); }

    const initAuth = async () => {
      try {
        // 如果使用者還沒登入，先用匿名身分，確保 App 能動
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Guest Auth Error:", error);
      }
    };
    
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Sync: Firestore (Cloud) + LocalStorage (Backup)
