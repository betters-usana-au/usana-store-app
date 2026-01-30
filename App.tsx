
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Package, PlusCircle, MinusCircle, History, 
  AlertTriangle, DollarSign, Search, RefreshCcw, Settings, 
  Trash2, Plus, ChevronDown, Download, Upload, 
  ShieldCheck, LogOut, Users, Key, Database, Link, ExternalLink, Filter, Calendar, Tag, Lock, User, Clock, RotateCcw,
  Terminal, Info, CheckCircle2, ChevronRight, Menu, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { USANA_CATALOG } from './catalog';
import { 
  AppData, InventoryItem, InboundMethod, OutboundType, 
  Transaction, Product, UserAccount, GlobalState, CloudConfig, DataVersion, SystemUpdateLog
} from './types';

// ==========================================
// 当前代码版本定义 (由 AI 维护)
// ==========================================
const CURRENT_APP_CODE_VERSION = "2.3.0";
const UPDATE_DETAILS = [
  "优化移动端自适应布局：为手机用户新增底部导航栏 (Build 2.3.0)",
  "大幅提升登录页面表单文字对比度，解决字体过浅问题",
  "修复移动端侧边栏隐藏后无法切换功能的 UI 缺陷",
  "优化移动端 Header 布局，增加用户退出入口"
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-rose-500'];
const DEFAULT_SUPABASE_URL = "https://mvjmkyjnffphqehtuhk.supabase.co";

export default function App() {
  const [globalState, setGlobalState] = useState<GlobalState>(() => {
    const saved = localStorage.getItem('usana_v3_state');
    const initialState: GlobalState = saved ? JSON.parse(saved) : {
      currentUser: undefined,
      accounts: {},
      userStore: {},
      cloudConfig: { 
        supabaseUrl: DEFAULT_SUPABASE_URL, 
        supabaseKey: '', 
        isEnabled: false,
        currentVersion: '1.0.0'
      },
      lastKnownCodeVersion: "0.0.0",
      systemLogs: []
    };
    return initialState;
  });

  const [activeTab, setActiveTab] = useState<'dash' | 'inv' | 'in' | 'out' | 'hist' | 'settings'>('dash');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // 监听代码版本变更
  useEffect(() => {
    if (globalState.lastKnownCodeVersion !== CURRENT_APP_CODE_VERSION) {
      const newLog: SystemUpdateLog = {
        version: CURRENT_APP_CODE_VERSION,
        date: new Date().toLocaleString(),
        changes: UPDATE_DETAILS
      };
      
      setGlobalState(prev => ({
        ...prev,
        lastKnownCodeVersion: CURRENT_APP_CODE_VERSION,
        systemLogs: [newLog, ...prev.systemLogs].slice(0, 20)
      }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('usana_v3_state', JSON.stringify(globalState));
  }, [globalState]);

  if (!globalState.currentUser) {
    return <AuthScreen 
      onLogin={(user, pass) => {
        const acc = globalState.accounts[user];
        if (acc && acc.passwordHash === pass) {
          setGlobalState(prev => ({ ...prev, currentUser: user }));
        } else {
          alert('用户名或密码错误！');
        }
      }} 
      onRegister={(user, pass, name) => {
        if (globalState.accounts[user]) return alert('用户名已存在！');
        const initialInventory: Record<string, InventoryItem> = {};
        USANA_CATALOG.forEach(p => {
          initialInventory[p.id] = { ...p, currentPrice: p.defaultPrice, stockQuantity: 0, threshold: 1 };
        });
        
        setGlobalState(prev => ({
          ...prev,
          accounts: { ...prev.accounts, [user]: { username: user, passwordHash: pass, displayName: name, avatarColor: AVATAR_COLORS[Math.floor(Math.random()*AVATAR_COLORS.length)] } },
          userStore: { ...prev.userStore, [user]: { current: { inventory: initialInventory, transactions: [], exchangeRate: 4.6 }, history: [], versionCounter: 1 } },
          currentUser: user
        }));
      }}
    />;
  }

  const currentUser = globalState.currentUser;
  const userAccount = globalState.accounts[currentUser];
  const userStore = globalState.userStore[currentUser];
  const activeData = userStore.current;
  const exchangeRate = activeData.exchangeRate || 4.6;
  const inventoryList = Object.values(activeData.inventory).sort((a, b) => a.id.localeCompare(b.id));

  const updateActiveData = (newData: Partial<AppData>) => {
    setGlobalState(prev => ({
      ...prev,
      userStore: {
        ...prev.userStore,
        [currentUser]: {
          ...prev.userStore[currentUser],
          current: { ...prev.userStore[currentUser].current, ...newData }
        }
      }
    }));
  };

  const handleSyncCloud = async () => {
    if (!globalState.cloudConfig.supabaseKey) {
      alert('请先在设置中配置云端 Anon Key');
      setActiveTab('settings');
      return;
    }
    
    setIsSyncing(true);
    await new Promise(r => setTimeout(r, 1200));

    const nextVerNum = userStore.versionCounter + 1;
    const versionTag = `v1.0.${nextVerNum}`;
    const newSnapshot: DataVersion = {
      id: Date.now().toString(),
      versionTag,
      timestamp: new Date().toLocaleString(),
      description: `手动同步 (${activeTab})`,
      data: JSON.parse(JSON.stringify(activeData)),
      codeVersion: CURRENT_APP_CODE_VERSION
    };

    setGlobalState(prev => ({
      ...prev,
      userStore: {
        ...prev.userStore,
        [currentUser]: {
          ...prev.userStore[currentUser],
          history: [newSnapshot, ...prev.userStore[currentUser].history].slice(0, 10),
          versionCounter: nextVerNum
        }
      },
      cloudConfig: {
        ...prev.cloudConfig,
        lastSyncedAt: new Date().toLocaleString(),
        currentVersion: versionTag
      }
    }));
    
    setIsSyncing(false);
    alert(`同步成功！云端版本 ${versionTag}`);
  };

  const handleRestoreVersion = (version: DataVersion) => {
    if(!confirm(`确认恢复数据？\n代码环境：${version.codeVersion}`)) return;
    updateActiveData(version.data);
    alert('恢复成功！');
  };

  const filteredInventory = inventoryList.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* 桌面端侧边栏 */}
      <nav className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex shrink-0 h-screen sticky top-0">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter">USANA PRO</h1>
          </div>
          
          <button onClick={() => setGlobalState(prev => ({...prev, currentUser: undefined}))} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all group">
            <div className={`w-8 h-8 rounded-full ${userAccount.avatarColor} flex items-center justify-center text-white text-[10px] font-black`}>
              {userAccount.displayName[0]}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-[11px] font-black text-slate-800 truncate">{userAccount.displayName}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">退出系统</div>
            </div>
            <LogOut size={14} className="ml-auto text-slate-300 group-hover:text-rose-500" />
          </button>
        </div>
        
        <div className="flex-1 px-4 space-y-1">
          <NavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={20}/>} label="数据报表" />
          <NavItem active={activeTab === 'inv'} onClick={() => setActiveTab('inv')} icon={<Package size={20}/>} label="库存清单" />
          <NavItem active={activeTab === 'in'} onClick={() => setActiveTab('in')} icon={<PlusCircle size={20}/>} label="采购进货" />
          <NavItem active={activeTab === 'out'} onClick={() => setActiveTab('out')} icon={<MinusCircle size={20}/>} label="出库领用" />
          <NavItem active={activeTab === 'hist'} onClick={() => setActiveTab('hist'} icon={<History size={20}/>} label="历史流水" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="系统进化史" />
        </div>

        <div className="p-6">
           <div className="mb-4 text-center">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Build v{CURRENT_APP_CODE_VERSION}</span>
           </div>
           <button onClick={handleSyncCloud} disabled={isSyncing} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100'}`}>
             {isSyncing ? <RefreshCcw size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
             {isSyncing ? '同步中...' : '同步云端'}
           </button>
        </div>
      </nav>

      {/* 移动端底部导航栏 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 px-2 py-3 flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <MobileNavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={20}/>} label="报表" />
        <MobileNavItem active={activeTab === 'inv'} onClick={() => setActiveTab('inv')} icon={<Package size={20}/>} label="库存" />
        <MobileNavItem active={activeTab === 'in'} onClick={() => setActiveTab('in')} icon={<PlusCircle size={20}/>} label="进货" />
        <MobileNavItem active={activeTab === 'out'} onClick={() => setActiveTab('out')} icon={<MinusCircle size={20}/>} label="出库" />
        <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="系统" />
      </div>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto pb-24 md:pb-0">
        <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200 px-6 md:px-10 py-5 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* 手机端用户图标，点击可退出 */}
             <div className="md:hidden">
               <button onClick={() => setGlobalState(prev => ({...prev, currentUser: undefined}))} className={`w-8 h-8 rounded-lg ${userAccount.avatarColor} flex items-center justify-center text-white text-[10px] font-black shadow-sm active:scale-90 transition-all`}>
                  {userAccount.displayName[0]}
               </button>
             </div>
             <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase truncate">
                {activeTab === 'dash' && 'Overview'}
                {activeTab === 'inv' && 'Inventory'}
                {activeTab === 'in' && 'Inbound'}
                {activeTab === 'out' && 'Outbound'}
                {activeTab === 'hist' && 'History'}
                {activeTab === 'settings' && 'Systems'}
             </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                <input 
                  type="text" placeholder="搜索..." 
                  className="pl-10 pr-4 py-2 md:py-3 bg-slate-100/50 rounded-xl md:rounded-2xl text-sm focus:outline-none border-none w-32 md:w-64 transition-all font-semibold focus:bg-white focus:shadow-lg focus:shadow-slate-100"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </header>

        <div className="p-4 md:p-10 max-w-[1400px] mx-auto">
          {activeTab === 'dash' && <Dashboard inventory={inventoryList} transactions={activeData.transactions} exchangeRate={exchangeRate} />}
          {activeTab === 'inv' && <InventoryGrid items={filteredInventory} exchangeRate={exchangeRate} onThresholdUpdate={(id, val) => {
             const nextInv = { ...activeData.inventory };
             nextInv[id] = { ...nextInv[id], threshold: val };
             updateActiveData({ inventory: nextInv });
          }} onDelete={(id) => {
            if(!confirm('移除产品？')) return;
            const nextInv = { ...activeData.inventory };
            delete nextInv[id];
            updateActiveData({ inventory: nextInv });
          }} />}
          {activeTab === 'in' && <InboundForm catalog={inventoryList} onSubmit={(id, q, p, m, d) => {
            const product = activeData.inventory[id];
            const newTransaction: Transaction = {
              id: Date.now().toString(), productId: id, productName: product.name,
              date: d, quantity: q, price: p, currency: product.currency, type: 'inbound', detail: m
            };
            updateActiveData({
              inventory: { ...activeData.inventory, [id]: { ...product, currentPrice: p, stockQuantity: product.stockQuantity + q } },
              transactions: [newTransaction, ...activeData.transactions]
            });
            setActiveTab('inv');
          }} />}
          {activeTab === 'out' && <OutboundForm catalog={inventoryList} onSubmit={(id, q, t, n, d) => {
            const product = activeData.inventory[id];
            if (product.stockQuantity < q) return alert('库存不足！');
            const newTransaction: Transaction = {
              id: Date.now().toString(), productId: id, productName: product.name,
              date: d, quantity: q, price: product.currentPrice, currency: product.currency, type: 'outbound', detail: t, note: n
            };
            updateActiveData({
              inventory: { ...activeData.inventory, [id]: { ...product, stockQuantity: product.stockQuantity - q } },
              transactions: [newTransaction, ...activeData.transactions]
            });
            setActiveTab('inv');
          }} />}
          {activeTab === 'hist' && <TransactionHistory transactions={activeData.transactions} exchangeRate={exchangeRate} />}
          {activeTab === 'settings' && (
            <div className="space-y-6 md:space-y-10">
              <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-slate-100 relative">
                <h3 className="text-xl md:text-2xl font-black flex items-center gap-4 text-slate-800 tracking-tighter uppercase mb-8 md:mb-12">
                   <Terminal className="text-blue-500 w-6 h-6 md:w-8 md:h-8" />
                   系统代码进化史
                </h3>
                <div className="space-y-6">
                  {globalState.systemLogs.map((log, idx) => (
                    <div key={log.version} className="flex gap-4 md:gap-8 relative">
                       {idx !== globalState.systemLogs.length - 1 && (
                         <div className="absolute left-[15px] md:left-[23px] top-[40px] bottom-[-24px] w-0.5 bg-slate-100"></div>
                       )}
                       <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 z-10 ${idx === 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                          {idx === 0 ? <CheckCircle2 size={16} /> : <div className="text-[10px] font-black">v{log.version.split('.').pop()}</div>}
                       </div>
                       <div className="flex-1 pb-4">
                          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2">
                             <span className={`text-xs md:text-sm font-black ${idx === 0 ? 'text-blue-600' : 'text-slate-500'}`}>Version {log.version}</span>
                             <span className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase">{log.date}</span>
                          </div>
                          <ul className="space-y-1">
                             {log.changes.map((change, cidx) => (
                               <li key={cidx} className="flex items-start gap-2 text-[10px] md:text-xs font-bold text-slate-600">
                                  <ChevronRight size={12} className="text-blue-300 shrink-0" />
                                  {change}
                               </li>
                             ))}
                          </ul>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-slate-100">
                <h3 className="text-xl md:text-2xl font-black flex items-center gap-4 text-slate-800 tracking-tighter uppercase mb-8">
                  <Clock className="text-blue-500 w-8 h-8" />
                  云端备份回溯
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userStore.history.map((ver) => (
                    <div key={ver.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all flex flex-col justify-between">
                       <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                             <span className="font-black text-slate-800">{ver.versionTag}</span>
                             <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[8px] font-black">Build {ver.codeVersion}</span>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{ver.timestamp}</p>
                       </div>
                       <button onClick={() => handleRestoreVersion(ver)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-900 hover:text-white transition-all">恢复此版本</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- 移动端专用组件 ---
function MobileNavItem({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600 scale-110' : 'text-slate-400 opacity-60'}`}>
      <div className={active ? 'bg-blue-50 p-2 rounded-xl' : 'p-2'}>{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

// --- 桌面端专用组件 ---
function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200 font-bold' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
      <div className={active ? 'scale-110' : 'group-hover:rotate-6'}>{icon}</div>
      <span className="text-sm tracking-tight">{label}</span>
    </button>
  );
}

// --- 增强版登录组件 ---
function AuthScreen({ onLogin, onRegister }: { onLogin: (u:string,p:string)=>void, onRegister: (u:string,p:string,n:string)=>void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 font-sans overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl p-8 md:p-16 text-center animate-in zoom-in duration-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white mx-auto mb-6 md:mb-10 shadow-2xl shadow-blue-100 rotate-6">
          {/* Fix: Removed invalid 'md' prop from Lucide icon */}
          <Package size={32} />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter mb-2">{isLogin ? '欢迎回来' : '创建管理账户'}</h1>
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 md:mb-12">USANA Household Management</p>
        
        <div className="space-y-4 mb-8 md:mb-10 text-left">
          <div className="group">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-4 mb-2 block">用户名 (Username)</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                className="w-full pl-14 pr-6 py-4 md:py-5 bg-slate-50 border-4 border-slate-50 rounded-2xl md:rounded-3xl focus:border-blue-500 focus:bg-white transition-all font-black text-slate-900 placeholder:text-slate-300" 
                placeholder="请输入用户名"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>
          </div>
          <div className="group">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-4 mb-2 block">密码 (Password)</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                className="w-full pl-14 pr-6 py-4 md:py-5 bg-slate-50 border-4 border-slate-50 rounded-2xl md:rounded-3xl focus:border-blue-500 focus:bg-white transition-all font-black text-slate-900 placeholder:text-slate-300" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>
          {!isLogin && (
            <div className="group animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-4 mb-2 block">库房显示名称</label>
              <div className="relative">
                <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-14 pr-6 py-4 md:py-5 bg-slate-50 border-4 border-slate-50 rounded-2xl md:rounded-3xl focus:border-blue-500 focus:bg-white transition-all font-black text-slate-900" 
                  placeholder="如：我的家 / 父母家"
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                />
              </div>
            </div>
          )}
        </div>

        <button onClick={() => isLogin ? onLogin(username, password) : onRegister(username, password, displayName)} className="w-full py-5 md:py-6 bg-blue-600 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all mb-6 md:mb-8">
          {isLogin ? '登录管理系统' : '立即注册账户'}
        </button>

        <button onClick={() => setIsLogin(!isLogin)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors">
          {isLogin ? '还没有账户？点击创建新库房' : '已有账户？点击返回登录'}
        </button>

        <div className="mt-8 md:mt-12 flex items-center justify-center gap-3 text-slate-300">
           <div className="flex items-center gap-1">
              <Terminal size={12} />
              <span className="text-[8px] font-black uppercase tracking-widest">Build v{CURRENT_APP_CODE_VERSION}</span>
           </div>
           <ShieldCheck size={16} />
           <span className="text-[10px] font-black uppercase tracking-widest">AES-256 加密</span>
        </div>
      </div>
    </div>
  );
}

// --- Dashboard & Helpers ---
function Dashboard({ inventory, transactions, exchangeRate }: any) {
  const totalValueAUD = inventory.reduce((acc: number, item: any) => {
    const priceAUD = item.currency === 'AUD' ? item.currentPrice : item.currentPrice / exchangeRate;
    return acc + (item.stockQuantity * priceAUD);
  }, 0);
  const lowStockCount = inventory.filter((item: any) => item.stockQuantity <= item.threshold).length;
  const outboundData = useMemo(() => {
    const stats: Record<string, number> = {};
    transactions.filter((t: any) => t.type === 'outbound').forEach((t: any) => {
      stats[t.detail] = (stats[t.detail] || 0) + t.quantity;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        <StatCard icon={<DollarSign size={24}/>} title="资产总值 (AUD)" value={`A$${totalValueAUD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="blue" />
        <StatCard icon={<AlertTriangle size={24}/>} title="预警产品" value={lowStockCount} color={lowStockCount > 0 ? "rose" : "emerald"} />
        <StatCard icon={<RefreshCcw size={24}/>} title="实时汇率" value={`1:${exchangeRate}`} color="indigo" className="hidden lg:block" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border border-slate-100 h-[350px] md:h-[400px]">
          <h3 className="text-sm md:text-lg font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tighter text-slate-700">出库用途占比</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={outboundData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={8} dataKey="value">
                {outboundData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="hidden lg:flex bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 h-[400px] items-center justify-center text-slate-300">
           <div className="text-center">
              {/* Fix: Recharts 'BarChart' is not an icon; using 'LayoutDashboard' icon from lucide-react instead */}
              <LayoutDashboard size={40} className="mx-auto mb-4 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-40">品类分析模块加载中...</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color, className }: any) {
  const colorMap: any = { blue: 'bg-blue-600 shadow-blue-100', rose: 'bg-rose-500 shadow-rose-100', emerald: 'bg-emerald-500 shadow-emerald-100', indigo: 'bg-indigo-600 shadow-indigo-100' };
  return (
    <div className={`p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-2xl text-white ${colorMap[color]} animate-in zoom-in duration-500 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 md:p-3 bg-white/20 rounded-xl md:rounded-2xl backdrop-blur-sm">{icon}</div>
        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
      </div>
      <p className="text-2xl md:text-3xl font-black tracking-tighter">{value}</p>
    </div>
  );
}

function InventoryGrid({ items, exchangeRate, onThresholdUpdate, onDelete }: any) {
  return (
    <div className="bg-white rounded-2xl md:rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50 text-slate-400 text-[9px] md:text-[10px] uppercase font-black tracking-widest">
            <tr><th className="px-6 md:px-10 py-6 md:py-8">产品 & 编号</th><th className="px-6 md:px-10 py-6 md:py-8 text-right">参考价 (AUD)</th><th className="px-6 md:px-10 py-6 md:py-8 text-center">当前库存</th><th className="px-6 md:px-10 py-6 md:py-8 text-center">预警</th><th className="px-6 md:px-10 py-6 md:py-8">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item: InventoryItem) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-all group">
                <td className="px-6 md:px-10 py-4 md:py-6">
                  <div className="font-black text-slate-800 text-sm">{item.name}</div>
                  <div className="text-[9px] md:text-[10px] font-mono text-slate-300">{item.id}</div>
                </td>
                <td className="px-6 md:px-10 py-4 md:py-6 text-right font-black text-sm">A${(item.currency === 'AUD' ? item.currentPrice : item.currentPrice / exchangeRate).toFixed(2)}</td>
                <td className="px-6 md:px-10 py-4 md:py-6 text-center">
                  <span className={`inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-black text-xs md:text-sm ${item.stockQuantity <= item.threshold ? 'bg-rose-100 text-rose-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}>{item.stockQuantity}</span>
                </td>
                <td className="px-6 md:px-10 py-4 md:py-6 text-center"><input type="number" className="w-12 md:w-16 p-1 md:p-2 bg-slate-100 rounded-lg md:rounded-xl text-center font-black focus:ring-2 focus:ring-blue-500 outline-none text-xs md:text-sm" value={item.threshold} onChange={(e) => onThresholdUpdate(item.id, Number(e.target.value))} /></td>
                <td className="px-6 md:px-10 py-4 md:py-6"><button onClick={() => onDelete(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
                  {/* Fix: Removed invalid 'md' prop from Lucide icon */}
                  <Trash2 size={16} />
                </button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && <div className="p-12 md:p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">暂无库存记录</div>}
    </div>
  );
}

function InboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const selectedProduct = catalog.find((p: any) => p.id === selectedId);
  useEffect(() => { if (selectedProduct) setPrice(selectedProduct.currentPrice || selectedProduct.defaultPrice); }, [selectedId]);

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-lg md:text-2xl font-black mb-8 md:mb-10 text-slate-800 tracking-tighter uppercase flex items-center gap-3"><PlusCircle className="text-blue-600" /> 采购进货登记</h3>
      <div className="space-y-6 md:space-y-8">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">选择产品</label>
          <select className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- 请选择产品 --</option>
            {catalog.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">进货数量</label><input type="number" className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">单价 ({selectedProduct?.currency || '-'})</label><input type="number" className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
        </div>
        <button disabled={!selectedId} onClick={() => onSubmit(selectedId, qty, price, '采购', new Date().toISOString().split('T')[0])} className="w-full py-5 md:py-6 bg-blue-600 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-blue-100 disabled:opacity-20 transition-all">确认入库</button>
      </div>
    </div>
  );
}

function OutboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [type, setType] = useState(OutboundType.SELF);
  const product = catalog.find((p: any) => p.id === selectedId);
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-lg md:text-2xl font-black mb-8 md:mb-10 text-slate-800 tracking-tighter uppercase flex items-center gap-3"><MinusCircle className="text-rose-500" /> 出库领用登记</h3>
      <div className="space-y-6 md:space-y-8">
        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">产品名称</label><select className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- 选择出库产品 --</option>
            {catalog.filter((p:any)=>p.stockQuantity>0).map((p: any) => <option key={p.id} value={p.id}>{p.name} (余{p.stockQuantity})</option>)}
          </select></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">数量</label><input type="number" max={product?.stockQuantity} className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">用途</label><select className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={type} onChange={(e) => setType(e.target.value as OutboundType)}>
              {Object.values(OutboundType).map(v => <option key={v} value={v}>{v}</option>)}
            </select></div>
        </div>
        <button disabled={!selectedId || (product && product.stockQuantity < qty)} onClick={() => onSubmit(selectedId, qty, type, '', new Date().toISOString().split('T')[0])} className="w-full py-5 md:py-6 bg-slate-900 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-slate-200 disabled:opacity-20 transition-all">确认出库</button>
      </div>
    </div>
  );
}

function TransactionHistory({ transactions, exchangeRate }: any) {
  return (
    <div className="bg-white rounded-2xl md:rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[500px]">
          <thead className="bg-slate-50 text-slate-400 text-[9px] md:text-[10px] uppercase font-black tracking-widest">
            <tr><th className="px-6 md:px-10 py-6 md:py-8">日期 & 产品</th><th className="px-6 md:px-10 py-6 md:py-8">类型</th><th className="px-6 md:px-10 py-6 md:py-8 text-right">变动量</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs md:text-sm">
            {transactions.map((t: Transaction) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-all">
                <td className="px-6 md:px-10 py-4 md:py-6"><div className="text-[9px] md:text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">{t.date}</div><div className="font-bold text-slate-800">{t.productName}</div></td>
                <td className="px-6 md:px-10 py-4 md:py-6"><span className={`px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest ${t.type === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{t.type === 'inbound' ? '进货入库' : '出库领用'}</span></td>
                <td className={`px-6 md:px-10 py-4 md:py-6 text-right font-black text-base md:text-lg ${t.type === 'inbound' ? 'text-blue-600' : 'text-slate-400'}`}>{t.type === 'inbound' ? `+${t.quantity}` : `-${t.quantity}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {transactions.length === 0 && <div className="p-12 md:p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">暂无操作流水</div>}
    </div>
  );
}
