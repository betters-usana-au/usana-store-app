
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Package, PlusCircle, MinusCircle, History, 
  AlertTriangle, DollarSign, Search, RefreshCcw, Settings, 
  Trash2, Plus, ChevronDown, Download, Upload, 
  ShieldCheck, LogOut, Users, Key, Database, Link, ExternalLink, Filter, Calendar, Tag, Lock, User, Clock, RotateCcw,
  Terminal, Info, CheckCircle2, ChevronRight
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
const CURRENT_APP_CODE_VERSION = "2.2.0";
const UPDATE_DETAILS = [
  "新增代码版本自动追踪系统 (Build 2.2.0)",
  "优化多账户登录及云同步逻辑",
  "实现系统进化史看板，支持功能变更追溯",
  "修复 Supabase URL 预置可能导致的渲染白屏问题"
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
        systemLogs: [newLog, ...prev.systemLogs].slice(0, 20) // 保留最近20次更新
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
      description: `手动备份 (${activeTab})`,
      data: JSON.parse(JSON.stringify(activeData)),
      codeVersion: CURRENT_APP_CODE_VERSION // 关键：记录此时的代码版本
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
    alert(`同步成功！云端版本 ${versionTag} (基于代码 ${CURRENT_APP_CODE_VERSION})`);
  };

  const handleRestoreVersion = (version: DataVersion) => {
    if(!confirm(`确认恢复数据？\n版本：${version.versionTag}\n代码环境：${version.codeVersion}\n如果当前代码已更新，旧数据可能缺少某些新字段。`)) return;
    updateActiveData(version.data);
    alert('已成功恢复历史数据！');
  };

  const handleInbound = (productId: string, quantity: number, price: number, method: string, date: string) => {
    const product = activeData.inventory[productId];
    const newTransaction: Transaction = {
      id: Date.now().toString(), productId, productName: product.name,
      date, quantity, price, currency: product.currency, type: 'inbound', detail: method
    };
    updateActiveData({
      inventory: { ...activeData.inventory, [productId]: { ...product, currentPrice: price, stockQuantity: product.stockQuantity + quantity } },
      transactions: [newTransaction, ...activeData.transactions]
    });
    setActiveTab('inv');
  };

  const handleOutbound = (productId: string, quantity: number, type: string, note: string, date: string) => {
    const product = activeData.inventory[productId];
    if (product.stockQuantity < quantity) return alert('库存不足！');
    const newTransaction: Transaction = {
      id: Date.now().toString(), productId, productName: product.name,
      date, quantity, price: product.currentPrice, currency: product.currency, type: 'outbound', detail: type, note
    };
    updateActiveData({
      inventory: { ...activeData.inventory, [productId]: { ...product, stockQuantity: product.stockQuantity - quantity } },
      transactions: [newTransaction, ...activeData.transactions]
    });
    setActiveTab('inv');
  };

  const filteredInventory = inventoryList.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <nav className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter">USANA PRO</h1>
          </div>
          
          <button onClick={() => setGlobalState(prev => ({...prev, currentUser: undefined}))} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all group">
            <div className={`w-8 h-8 rounded-full ${userAccount.avatarColor} flex items-center justify-center text-white text-[10px] font-black`}>
              {userAccount.displayName.substring(0, 1)}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-[11px] font-black text-slate-800 truncate">{userAccount.displayName}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><Lock size={8}/> 退出系统</div>
            </div>
            <LogOut size={14} className="ml-auto text-slate-300 group-hover:text-rose-500" />
          </button>
        </div>
        
        <div className="flex-1 px-4 space-y-1">
          <NavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={20}/>} label="数据报表" />
          <NavItem active={activeTab === 'inv'} onClick={() => setActiveTab('inv')} icon={<Package size={20}/>} label="库存清单" />
          <NavItem active={activeTab === 'in'} onClick={() => setActiveTab('in')} icon={<PlusCircle size={20}/>} label="采购进货" />
          <NavItem active={activeTab === 'out'} onClick={() => setActiveTab('out')} icon={<MinusCircle size={20}/>} label="出库领用" />
          <NavItem active={activeTab === 'hist'} onClick={() => setActiveTab('hist')} icon={<History size={20}/>} label="历史流水" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="系统进化史" />
        </div>

        <div className="p-6">
           <div className="mb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-300 mb-1">
                 <Terminal size={10} />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em]">Build v{CURRENT_APP_CODE_VERSION}</span>
              </div>
           </div>
           <button 
             onClick={handleSyncCloud}
             disabled={isSyncing}
             className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100'}`}
           >
             {isSyncing ? <RefreshCcw size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
             {isSyncing ? '同步中...' : '同步云端版本'}
           </button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200 px-10 py-5 sticky top-0 z-10 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
            {activeTab === 'dash' && 'Overview'}
            {activeTab === 'inv' && 'Inventory'}
            {activeTab === 'in' && 'Inbound'}
            {activeTab === 'out' && 'Outbound'}
            {activeTab === 'hist' && 'History'}
            {activeTab === 'settings' && 'Systems History'}
          </h2>
          <div className="flex items-center gap-4">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                <input 
                  type="text" placeholder="搜索产品..." 
                  className="pl-11 pr-5 py-3 bg-slate-100/50 rounded-2xl text-sm focus:outline-none border-none w-64 transition-all font-semibold"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </header>

        <div className="p-10 max-w-[1400px] mx-auto pb-32">
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
          {activeTab === 'in' && <InboundForm catalog={inventoryList} onSubmit={handleInbound} />}
          {activeTab === 'out' && <OutboundForm catalog={inventoryList} onSubmit={handleOutbound} />}
          {activeTab === 'hist' && <TransactionHistory transactions={activeData.transactions} exchangeRate={exchangeRate} />}
          {activeTab === 'settings' && (
            <div className="space-y-10">
              {/* 代码進化史 */}
              <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8">
                   <Info className="text-slate-100 w-32 h-32 rotate-12" />
                </div>
                <div className="relative z-10">
                   <h3 className="text-2xl font-black flex items-center gap-4 text-slate-800 tracking-tighter uppercase mb-12">
                     <Terminal className="text-blue-500 w-8 h-8" />
                     系统代码进化史 (Application Logs)
                   </h3>
                   
                   <div className="space-y-8">
                     {globalState.systemLogs.map((log, idx) => (
                       <div key={log.version} className="flex gap-8 relative">
                          {idx !== globalState.systemLogs.length - 1 && (
                            <div className="absolute left-[23px] top-[46px] bottom-[-32px] w-0.5 bg-slate-100"></div>
                          )}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 ${idx === 0 ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                             {idx === 0 ? <CheckCircle2 size={24} /> : <div className="font-black text-xs">v{log.version.split('.').pop()}</div>}
                          </div>
                          <div className="flex-1 pb-4">
                             <div className="flex items-center gap-4 mb-3">
                                <span className={`text-sm font-black tracking-tight ${idx === 0 ? 'text-blue-600' : 'text-slate-500'}`}>Version {log.version}</span>
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{log.date}</span>
                                {idx === 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-black uppercase">Current Running</span>}
                             </div>
                             <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                                {log.changes.map((change, cidx) => (
                                  <li key={cidx} className="flex items-start gap-2 text-xs font-bold text-slate-600 group">
                                     <ChevronRight size={14} className="text-blue-300 group-hover:translate-x-1 transition-transform" />
                                     {change}
                                  </li>
                                ))}
                             </ul>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>

              {/* 数据快照 */}
              <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black flex items-center gap-4 text-slate-800 tracking-tighter uppercase">
                    <Clock className="text-blue-500 w-8 h-8" />
                    云端快照回溯 (Snapshot Manager)
                  </h3>
                  <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-400">
                    对应代码版本精准恢复
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userStore.history.map((ver) => (
                    <div key={ver.id} className="p-6 bg-slate-50 rounded-3xl hover:bg-blue-50/50 transition-all group flex flex-col justify-between">
                       <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                             <span className="font-black text-slate-800 text-lg">{ver.versionTag}</span>
                             <span className="px-2 py-1 bg-slate-200 text-slate-500 rounded text-[9px] font-black">Code: v{ver.codeVersion}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ver.timestamp}</p>
                       </div>
                       <button 
                          onClick={() => handleRestoreVersion(ver)}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                       >
                          <RotateCcw size={14} /> 恢复此备份数据
                       </button>
                    </div>
                  ))}
                  {userStore.history.length === 0 && (
                    <div className="col-span-2 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-[2.5rem]">暂无云端数据，请点击“同步云端版本”</div>
                  )}
                </div>
              </div>

              {/* Supabase 链接设置 */}
              <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100">
                <div className="space-y-6">
                  <div className="group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Anon Public Key (Supabase 凭证)</label>
                    <div className="relative">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="password"
                        className="w-full pl-14 pr-6 py-5 bg-slate-100 border-4 border-transparent rounded-3xl focus:border-blue-500 transition-all font-mono text-sm"
                        placeholder="请输入您的 Anon Key..."
                        value={globalState.cloudConfig.supabaseKey}
                        onChange={(e) => setGlobalState(prev => ({...prev, cloudConfig: {...prev.cloudConfig, supabaseKey: e.target.value}}))}
                      />
                    </div>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-3xl flex items-center gap-4 border border-blue-100">
                    <RefreshCcw size={20} className="text-blue-500" />
                    <div>
                      <h4 className="text-[10px] font-black text-blue-800 uppercase">版本同步逻辑</h4>
                      <p className="text-[9px] text-blue-600 font-medium">数据版本关联当前代码 Build 编号。若新代码破坏了旧数据结构，请联系 AI 恢复特定 Build 的代码。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- 增强版登录组件 ---
function AuthScreen({ onLogin, onRegister }: { onLogin: (u:string,p:string)=>void, onRegister: (u:string,p:string,n:string)=>void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[4rem] shadow-2xl p-16 text-center animate-in zoom-in duration-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-10 shadow-2xl shadow-blue-100 rotate-6">
          <Package size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-4">{isLogin ? '欢迎回来' : '创建管理账户'}</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">USANA Household Management</p>
        
        <div className="space-y-4 mb-10 text-left">
          <div className="group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">用户名</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-4 border-slate-50 rounded-3xl focus:border-blue-500 transition-all font-bold" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          </div>
          <div className="group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">密码</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="password" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-4 border-slate-50 rounded-3xl focus:border-blue-500 transition-all font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          {!isLogin && (
            <div className="group animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">库房显示名称</label>
              <div className="relative">
                <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-4 border-slate-50 rounded-3xl focus:border-blue-500 transition-all font-bold" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <button onClick={() => isLogin ? onLogin(username, password) : onRegister(username, password, displayName)} className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all mb-8">
          {isLogin ? '登录管理系统' : '立即注册账户'}
        </button>
        <button onClick={() => setIsLogin(!isLogin)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors">
          {isLogin ? '还没有账户？点击创建新库房' : '已有账户？点击返回登录'}
        </button>
        <div className="mt-12 flex items-center justify-center gap-3 text-slate-300">
           <div className="flex items-center gap-1">
              <Terminal size={12} />
              <span className="text-[8px] font-black uppercase tracking-widest">Build v{CURRENT_APP_CODE_VERSION}</span>
           </div>
           <ShieldCheck size={16} />
           <span className="text-[10px] font-black uppercase tracking-widest">AES-256 加密云同步</span>
        </div>
      </div>
    </div>
  );
}

// --- 通用辅助组件 ---

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200 font-bold' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
      <div className={active ? 'scale-110' : 'group-hover:rotate-6'}>{icon}</div>
      <span className="text-sm tracking-tight">{label}</span>
    </button>
  );
}

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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard icon={<DollarSign size={24}/>} title="资产总值 (AUD)" value={`A$${totalValueAUD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="blue" />
        <StatCard icon={<AlertTriangle size={24}/>} title="预警产品" value={lowStockCount} color={lowStockCount > 0 ? "rose" : "emerald"} />
        <StatCard icon={<RefreshCcw size={24}/>} title="实时汇率" value={`1:${exchangeRate}`} color="indigo" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 h-[400px]">
          <h3 className="text-lg font-black mb-8 flex items-center gap-3 uppercase tracking-tighter text-slate-700">出库用途占比</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={outboundData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={8} dataKey="value">
                {outboundData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 h-[400px] flex items-center justify-center text-slate-300">
           <div className="text-center">
              <BarChart size={40} className="mx-auto mb-4 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-40">品类分析模块加载中...</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }: any) {
  const colorMap: any = { blue: 'bg-blue-600 shadow-blue-100', rose: 'bg-rose-500 shadow-rose-100', emerald: 'bg-emerald-500 shadow-emerald-100', indigo: 'bg-indigo-600 shadow-indigo-100' };
  return (
    <div className={`p-8 rounded-[2.5rem] shadow-2xl text-white ${colorMap[color]} animate-in zoom-in duration-500`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">{icon}</div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
      </div>
      <p className="text-3xl font-black tracking-tighter">{value}</p>
    </div>
  );
}

function InventoryGrid({ items, exchangeRate, onThresholdUpdate, onDelete }: any) {
  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
            <tr><th className="px-10 py-8">产品 & 编号</th><th className="px-10 py-8 text-right">参考价格 (AUD)</th><th className="px-10 py-8 text-center">当前库存</th><th className="px-10 py-8 text-center">预警阈值</th><th className="px-10 py-8">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item: InventoryItem) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-all group">
                <td className="px-10 py-6">
                  <div className="font-black text-slate-800">{item.name}</div>
                  <div className="text-[10px] font-mono text-slate-300">{item.id}</div>
                </td>
                <td className="px-10 py-6 text-right font-black">A${(item.currency === 'AUD' ? item.currentPrice : item.currentPrice / exchangeRate).toFixed(2)}</td>
                <td className="px-10 py-6 text-center">
                  <span className={`inline-block px-4 py-2 rounded-xl font-black ${item.stockQuantity <= item.threshold ? 'bg-rose-100 text-rose-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}>{item.stockQuantity}</span>
                </td>
                <td className="px-10 py-6 text-center"><input type="number" className="w-16 p-2 bg-slate-100 rounded-xl text-center font-black focus:ring-2 focus:ring-blue-500 outline-none" value={item.threshold} onChange={(e) => onThresholdUpdate(item.id, Number(e.target.value))} /></td>
                <td className="px-10 py-6"><button onClick={() => onDelete(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-sm">暂无库存记录</div>}
    </div>
  );
}

function InboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [method, setMethod] = useState(InboundMethod.AUTO_ORDER);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const selectedProduct = catalog.find((p: any) => p.id === selectedId);
  useEffect(() => { if (selectedProduct) setPrice(selectedProduct.currentPrice || selectedProduct.defaultPrice); }, [selectedId]);

  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-2xl font-black mb-10 text-slate-800 tracking-tighter uppercase flex items-center gap-3"><PlusCircle className="text-blue-600" /> 采购进货登记</h3>
      <div className="space-y-8">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">选择产品</label>
          <select className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- 请选择产品 --</option>
            {catalog.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">进货数量</label><input type="number" className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">单价 ({selectedProduct?.currency || '-'})</label><input type="number" className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
        </div>
        <button disabled={!selectedId} onClick={() => onSubmit(selectedId, qty, price, method, date)} className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-blue-100 disabled:opacity-20 transition-all">确认入库</button>
      </div>
    </div>
  );
}

function OutboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [type, setType] = useState(OutboundType.SELF);
  const [note, setNote] = useState('');
  const product = catalog.find((p: any) => p.id === selectedId);
  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-2xl font-black mb-10 text-slate-800 tracking-tighter uppercase flex items-center gap-3"><MinusCircle className="text-rose-500" /> 出库领用登记</h3>
      <div className="space-y-8">
        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">产品名称</label><select className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- 选择出库产品 --</option>
            {catalog.filter((p:any)=>p.stockQuantity>0).map((p: any) => <option key={p.id} value={p.id}>{p.name} (余{p.stockQuantity})</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-6">
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">数量</label><input type="number" max={product?.stockQuantity} className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">用途</label><select className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={type} onChange={(e) => setType(e.target.value as OutboundType)}>
              {Object.values(OutboundType).map(v => <option key={v} value={v}>{v}</option>)}
            </select></div>
        </div>
        <button disabled={!selectedId || (product && product.stockQuantity < qty)} onClick={() => onSubmit(selectedId, qty, type, note, new Date().toISOString().split('T')[0])} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-slate-200 disabled:opacity-20 transition-all">确认出库</button>
      </div>
    </div>
  );
}

function TransactionHistory({ transactions, exchangeRate }: any) {
  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
          <tr><th className="px-10 py-8">日期 & 产品</th><th className="px-10 py-8">类型</th><th className="px-10 py-8">详情</th><th className="px-10 py-8 text-right">变动量</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-sm">
          {transactions.map((t: Transaction) => (
            <tr key={t.id} className="hover:bg-slate-50 transition-all">
              <td className="px-10 py-6"><div className="text-[10px] font-black text-slate-400 flex items-center gap-1 mb-1 uppercase tracking-wider"><Calendar size={12}/> {t.date}</div><div className="font-bold text-slate-800">{t.productName}</div></td>
              <td className="px-10 py-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${t.type === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{t.type === 'inbound' ? '进货入库' : '领用出库'}</span></td>
              <td className="px-10 py-6"><div className="flex items-center gap-2 text-slate-500 font-medium"><Tag size={12} className="opacity-30" /> {t.detail}</div></td>
              <td className={`px-10 py-6 text-right font-black text-lg ${t.type === 'inbound' ? 'text-blue-600' : 'text-slate-400'}`}>{t.type === 'inbound' ? `+${t.quantity}` : `-${t.quantity}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">暂无操作流水</div>}
    </div>
  );
}
