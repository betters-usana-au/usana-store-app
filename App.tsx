
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Package, PlusCircle, MinusCircle, History, 
  AlertTriangle, DollarSign, Search, RefreshCcw, Settings, 
  Trash2, Plus, ChevronDown, Download, Upload, 
  ShieldCheck, LogOut, Users, Key, Database, Link, ExternalLink, Filter, Calendar, Tag, Lock, User, Clock, RotateCcw,
  Terminal, Info, CheckCircle2, ChevronRight, Menu, X, Cloud, CloudDownload, CloudUpload,
  BarChart as BarChartIcon, Copy, AlertCircle
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
// 当前代码版本定义
// ==========================================
const CURRENT_APP_CODE_VERSION = "2.4.2";
const UPDATE_DETAILS = [
  "强化 Supabase Upsert 逻辑：使用 on_conflict 参数确保多端同步覆盖准确 (Build 2.4.2)",
  "新增“后端环境自检”：在设置页面提供 SQL 建表代码，帮助用户配置数据库",
  "精准错误诊断：同步失败时显示详细错误报文 (404/403/500)",
  "视觉优化：设置页面的云端凭证区增加更直观的自检提示",
  "修复移动端搜索框在某些小屏设备上遮挡标题的问题"
];

// 用户提供的正确 URL
const CORRECT_SUPABASE_URL = "https://mvjmkyjnqffphqehtuhk.supabase.co";
// 用户提供的 API Key
const PROVIDED_ANON_KEY = "sb_publishable_bwFGGcrdiEfYCwDKtaPMww_Fk5Ow9o-";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const AVATAR_COLORS = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-600', 'bg-rose-600'];

const SQL_INIT_SCRIPT = `-- 请在 Supabase 的 SQL Editor 中执行以下脚本：
create table if not exists app_state (
  username text primary key,
  state jsonb not null,
  updated_at timestamp with time zone default now()
);

-- 开启 Row Level Security
alter table app_state enable row level security;

-- 创建允许匿名操作的策略 (简易家用模式)
create policy "Allow all for anon" on app_state for all using (true) with check (true);`;

export default function App() {
  const [globalState, setGlobalState] = useState<GlobalState>(() => {
    const saved = localStorage.getItem('usana_v3_state');
    const initialState: GlobalState = saved ? JSON.parse(saved) : {
      currentUser: undefined,
      accounts: {},
      userStore: {},
      cloudConfig: { 
        supabaseUrl: CORRECT_SUPABASE_URL, 
        supabaseKey: PROVIDED_ANON_KEY, 
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

  const currentUser = globalState.currentUser;
  const userAccount = currentUser ? globalState.accounts[currentUser] : null;
  const userStore = currentUser ? globalState.userStore[currentUser] : null;
  const activeData = userStore?.current;
  const exchangeRate = activeData?.exchangeRate || 4.6;
  
  const inventoryList: InventoryItem[] = activeData 
    ? (Object.values(activeData.inventory) as InventoryItem[]).sort((a: InventoryItem, b: InventoryItem) => a.id.localeCompare(b.id)) 
    : [];

  const updateActiveData = (newData: Partial<AppData>) => {
    if (!currentUser) return;
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

  const performCloudSync = useCallback(async (action: 'push' | 'pull') => {
    if (!currentUser || !globalState.cloudConfig.supabaseKey) {
      alert('请在设置中配置 Supabase Anon Key');
      return;
    }

    const { supabaseUrl, supabaseKey } = globalState.cloudConfig;
    const baseUrl = `${supabaseUrl}/rest/v1/app_state`;
    
    setIsSyncing(true);
    try {
      if (action === 'push') {
        const nextVerNum = (userStore?.versionCounter || 1) + 1;
        const versionTag = `v1.0.${nextVerNum}`;
        const newSnapshot: DataVersion = {
          id: Date.now().toString(),
          versionTag,
          timestamp: new Date().toLocaleString(),
          description: `云端同步 (${activeTab})`,
          data: JSON.parse(JSON.stringify(activeData)),
          codeVersion: CURRENT_APP_CODE_VERSION
        };

        const newHistory = [newSnapshot, ...(userStore?.history || [])].slice(0, 10);
        const payload = {
          username: currentUser,
          state: { current: activeData, history: newHistory, versionCounter: nextVerNum },
          updated_at: new Date().toISOString()
        };

        // 使用 on_conflict=username 参数确保 REST API 执行正确的 Upsert 操作
        const pushUrl = `${baseUrl}?on_conflict=username`;
        const res = await fetch(pushUrl, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`[HTTP ${res.status}] ${errText || '未知错误'}`);
        }

        setGlobalState(prev => ({
          ...prev,
          userStore: {
            ...prev.userStore,
            [currentUser]: { ...prev.userStore[currentUser], history: newHistory, versionCounter: nextVerNum }
          },
          cloudConfig: { ...prev.cloudConfig, lastSyncedAt: new Date().toLocaleString(), currentVersion: versionTag }
        }));
        
        if (activeTab !== 'settings') alert(`✅ 云端推送成功！版本：${versionTag}`);
      } else {
        const pullUrl = `${baseUrl}?username=eq.${currentUser}&select=*`;
        const res = await fetch(pullUrl, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`[HTTP ${res.status}] ${errText || '无法访问表，请检查 SQL 脚本是否已执行'}`);
        }
        
        const data = await res.json();
        
        if (data && data.length > 0) {
          const remoteState = data[0].state;
          setGlobalState(prev => ({
            ...prev,
            userStore: { ...prev.userStore, [currentUser]: remoteState },
            cloudConfig: { ...prev.cloudConfig, lastSyncedAt: new Date().toLocaleString() }
          }));
          alert('📥 云端数据已拉取并刷新！');
        } else {
          if (activeTab === 'settings') alert('云端暂无数据。请先执行一次“推送同步”。');
        }
      }
    } catch (e: any) {
      console.error('Cloud Sync Error:', e);
      alert(`❌ 同步失败：${e.message}\n\n排障提示：\n1. 确保 Supabase 中已创建 app_state 表\n2. 确保 Anon Key 正确 (以 eyJ 开头的长字符串)\n3. 检查网络连接`);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, globalState.cloudConfig, activeData, userStore, activeTab]);

  const handleSyncCloud = () => performCloudSync('push');
  const handleFetchCloud = () => performCloudSync('pull');

  useEffect(() => {
    if (currentUser && globalState.cloudConfig.supabaseKey) {
       performCloudSync('pull');
    }
  }, [currentUser]);

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

  const filteredInventory = inventoryList.filter((item: InventoryItem) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-sans">
      {/* 桌面端侧边栏 */}
      <nav className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex shrink-0 h-screen sticky top-0 shadow-sm">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter">USANA PRO</h1>
          </div>
          <button onClick={() => setGlobalState(prev => ({...prev, currentUser: undefined}))} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all group">
            <div className={`w-9 h-9 rounded-full ${userAccount?.avatarColor} flex items-center justify-center text-white text-[10px] font-black shadow-inner`}>
              {userAccount?.displayName[0]}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-[11px] font-black text-slate-800 truncate">{userAccount?.displayName}</div>
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">退出登录</div>
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
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="系统设置" />
        </div>
        <div className="p-6 border-t border-slate-50">
           <div className="mb-4 text-center">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Build v{CURRENT_APP_CODE_VERSION}</span>
           </div>
           <button onClick={handleSyncCloud} disabled={isSyncing} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100'}`}>
             {isSyncing ? <RefreshCcw size={16} className="animate-spin" /> : <CloudUpload size={16} />}
             推送同步
           </button>
        </div>
      </nav>

      {/* 移动端底部导航栏 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[100] px-4 py-3 flex justify-between items-center shadow-[0_-12px_40px_rgba(0,0,0,0.15)]">
        <MobileNavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={22}/>} label="报表" />
        <MobileNavItem active={activeTab === 'inv'} onClick={() => setActiveTab('inv')} icon={<Package size={22}/>} label="库存" />
        <MobileNavItem active={activeTab === 'in'} onClick={() => setActiveTab('in')} icon={<PlusCircle size={22}/>} label="进货" />
        <MobileNavItem active={activeTab === 'out'} onClick={() => setActiveTab('out')} icon={<MinusCircle size={22}/>} label="出库" />
        <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={22}/>} label="系统" />
      </div>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto pb-32 md:pb-0">
        <header className="bg-white/90 backdrop-blur-lg border-b border-slate-200 px-6 md:px-10 py-5 sticky top-0 z-50 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 truncate">
             <div className="md:hidden shrink-0">
               <button onClick={() => setGlobalState(prev => ({...prev, currentUser: undefined}))} className={`w-9 h-9 rounded-xl ${userAccount?.avatarColor} flex items-center justify-center text-white text-xs font-black shadow-md active:scale-95 transition-all`}>
                  {userAccount?.displayName[0]}
               </button>
             </div>
             <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase truncate">
                {activeTab === 'dash' && 'Overview'}
                {activeTab === 'inv' && 'Inventory'}
                {activeTab === 'in' && 'Inbound'}
                {activeTab === 'out' && 'Outbound'}
                {activeTab === 'hist' && 'History'}
                {activeTab === 'settings' && 'Systems'}
             </h2>
          </div>
          <div className="flex items-center gap-2">
             <div className="md:hidden flex gap-2">
               <button onClick={handleFetchCloud} disabled={isSyncing} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isSyncing ? 'bg-slate-100' : 'bg-slate-100 text-slate-600 active:bg-slate-800 active:text-white'}`}>
                  {isSyncing ? <RefreshCcw size={16} className="animate-spin" /> : <CloudDownload size={18} />}
               </button>
               <button onClick={handleSyncCloud} disabled={isSyncing} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isSyncing ? 'bg-slate-100' : 'bg-blue-100 text-blue-600 active:bg-blue-600 active:text-white'}`}>
                  {isSyncing ? <RefreshCcw size={16} className="animate-spin" /> : <CloudUpload size={18} />}
               </button>
             </div>
             <div className="relative group ml-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" placeholder="搜索..." 
                  className="pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 md:w-64 transition-all"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </header>

        <div className="p-4 md:p-10 max-w-7xl mx-auto">
          {activeTab === 'dash' && <Dashboard inventory={inventoryList} transactions={activeData?.transactions || []} exchangeRate={exchangeRate} />}
          {activeTab === 'inv' && <InventoryGrid items={filteredInventory} exchangeRate={exchangeRate} onThresholdUpdate={(id:string, val:number) => {
             const nextInv = { ...activeData.inventory };
             nextInv[id] = { ...nextInv[id], threshold: val };
             updateActiveData({ inventory: nextInv });
          }} onDelete={(id:string) => {
            if(!confirm('移除产品？')) return;
            const nextInv = { ...activeData.inventory };
            delete nextInv[id];
            updateActiveData({ inventory: nextInv });
          }} />}
          {activeTab === 'in' && <InboundForm catalog={inventoryList} onSubmit={(id:string, q:number, p:number, m:string, d:string) => {
            const product = activeData.inventory[id];
            const newTransaction: Transaction = {
              id: Date.now().toString(), productId: id, productName: product.name,
              date: d, quantity: q, price: p, currency: product.currency, type: 'inbound', detail: m
            };
            updateActiveData({
              inventory: { ...activeData.inventory, [id]: { ...product, currentPrice: p, stockQuantity: product.stockQuantity + q } },
              transactions: [newTransaction, ...(activeData?.transactions || [])]
            });
            setActiveTab('inv');
          }} />}
          {activeTab === 'out' && <OutboundForm catalog={inventoryList} onSubmit={(id:string, q:number, t:string, n:string, d:string) => {
            const product = activeData.inventory[id];
            if (product.stockQuantity < q) return alert('库存不足！');
            const newTransaction: Transaction = {
              id: Date.now().toString(), productId: id, productName: product.name,
              date: d, quantity: q, price: product.currentPrice, currency: product.currency, type: 'outbound', detail: t, note: n as any
            };
            updateActiveData({
              inventory: { ...activeData.inventory, [id]: { ...product, stockQuantity: product.stockQuantity - q } },
              transactions: [newTransaction, ...(activeData?.transactions || [])]
            });
            setActiveTab('inv');
          }} />}
          {activeTab === 'hist' && <TransactionHistory transactions={activeData?.transactions || []} />}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* 同步控制面板 */}
              <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="w-full md:w-auto">
                    <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight flex items-center gap-2">
                       <Cloud className="text-blue-600" /> 云端跨设备同步
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       最后同步: {globalState.cloudConfig.lastSyncedAt || '从未同步'}
                    </p>
                 </div>
                 <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={handleFetchCloud} disabled={isSyncing} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                       <CloudDownload size={16} /> 拉取数据
                    </button>
                    <button onClick={handleSyncCloud} disabled={isSyncing} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-50 transition-all">
                       {isSyncing ? <RefreshCcw size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                       推送数据
                    </button>
                 </div>
              </div>

              {/* 环境自检与 SQL 脚本 */}
              <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black flex items-center gap-3 text-slate-800 uppercase tracking-tight">
                    <Database className="text-blue-600" size={24} /> 后端环境自检
                  </h3>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(SQL_INIT_SCRIPT);
                      alert('SQL 脚本已复制到剪贴板！');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-all"
                  >
                    <Copy size={12} /> 复制脚本
                  </button>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 md:p-6 overflow-hidden">
                   <div className="flex items-start gap-3 mb-4 text-amber-400">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold leading-relaxed">
                        如果同步提示 404 或 406，请确保您在 Supabase 的 <b>SQL Editor</b> 中运行了以下脚本来初始化表结构。
                      </p>
                   </div>
                   <pre className="text-[10px] font-mono text-blue-300 overflow-x-auto whitespace-pre leading-relaxed">
                     {SQL_INIT_SCRIPT}
                   </pre>
                </div>
              </div>

              {/* 开发日志 */}
              <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-black flex items-center gap-3 text-slate-800 mb-8 uppercase tracking-tight">
                   <Terminal className="text-blue-600" size={24} /> 开发日志 v{CURRENT_APP_CODE_VERSION}
                </h3>
                <div className="space-y-6">
                  {globalState.systemLogs.map((log, idx) => (
                    <div key={log.version} className="flex gap-4 relative">
                       {idx !== globalState.systemLogs.length - 1 && (
                         <div className="absolute left-[15px] top-[40px] bottom-[-24px] w-0.5 bg-slate-100"></div>
                       )}
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {idx === 0 ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-black">{log.version.split('.').pop()}</span>}
                       </div>
                       <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-2">
                             <span className={`text-sm font-black ${idx === 0 ? 'text-blue-600' : 'text-slate-800'}`}>Build {log.version}</span>
                             <span className="text-[10px] font-bold text-slate-400">{log.date}</span>
                          </div>
                          <ul className="space-y-1">
                             {log.changes.map((change, cidx) => (
                               <li key={cidx} className="flex items-start gap-2 text-[11px] font-medium text-slate-600">
                                  <ChevronRight size={12} className="text-blue-300 shrink-0 mt-0.5" />
                                  {change}
                               </li>
                             ))}
                          </ul>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 凭证配置 */}
              <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-black flex items-center gap-3 text-slate-800 mb-8 uppercase tracking-tight">
                  <Key className="text-blue-600" size={24} /> 云端同步凭证
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Supabase URL</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-mono text-xs"
                      value={globalState.cloudConfig.supabaseUrl}
                      onChange={(e) => setGlobalState(prev => ({...prev, cloudConfig: {...prev.cloudConfig, supabaseUrl: e.target.value}}))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Supabase Anon Key</label>
                    <input 
                      type="password" 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 outline-none font-mono text-xs"
                      placeholder="以 eyJ 开头的长 JWT 字符串"
                      value={globalState.cloudConfig.supabaseKey}
                      onChange={(e) => setGlobalState(prev => ({...prev, cloudConfig: {...prev.cloudConfig, supabaseKey: e.target.value}}))}
                    />
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                     <p className="text-[10px] text-blue-800 font-bold uppercase mb-1">提示:</p>
                     <p className="text-[11px] text-blue-600 leading-relaxed font-medium">
                        在不同设备登录同一账户后，先点击“拉取”加载进度。如有任何同步红字报错，请核对上方 SQL 自检脚本。
                     </p>
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

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
      {icon}
      <span className="text-sm tracking-tight">{label}</span>
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
      <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-blue-50' : ''}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function AuthScreen({ onLogin, onRegister }: { onLogin: (u:string,p:string)=>void, onRegister: (u:string,p:string,n:string)=>void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl">
          <Package size={32} />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">{isLogin ? '欢迎回来' : '注册新库房'}</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 text-slate-500">House Management System</p>
        
        <div className="space-y-5 mb-8 text-left">
          <div>
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1 mb-2 block">用户名 / Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:bg-white transition-all font-black text-slate-900 placeholder:text-slate-300" 
                placeholder="你的登录账号"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1 mb-2 block">密码 / Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:bg-white transition-all font-black text-slate-900 placeholder:text-slate-300" 
                placeholder="你的登录密码"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>
          {!isLogin && (
            <div className="animate-in slide-in-from-top-2">
              <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1 mb-2 block">显示名称 / Display Name</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:bg-white transition-all font-black text-slate-900" 
                  placeholder="例如：主卧库房"
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                />
              </div>
            </div>
          )}
        </div>

        <button onClick={() => isLogin ? onLogin(username, password) : onRegister(username, password, displayName)} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.01] active:scale-[0.99] transition-all mb-6">
          {isLogin ? '立即登录' : '完成注册'}
        </button>

        <button onClick={() => setIsLogin(!isLogin)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors">
          {isLogin ? '创建新库房账户' : '已有账号？返回登录'}
        </button>

        <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-center gap-3 text-slate-300">
          <Terminal size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest">Build v{CURRENT_APP_CODE_VERSION}</span>
        </div>
      </div>
    </div>
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="p-6 bg-blue-600 rounded-[2rem] shadow-lg shadow-blue-100 text-white">
           <div className="flex justify-between items-start mb-4">
              <DollarSign size={20} className="bg-white/20 p-1 rounded-lg" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">资产估值 (AUD)</span>
           </div>
           <p className="text-2xl font-black">A${totalValueAUD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`p-6 rounded-[2rem] shadow-lg text-white ${lowStockCount > 0 ? 'bg-rose-500 shadow-rose-100' : 'bg-emerald-500 shadow-emerald-100'}`}>
           <div className="flex justify-between items-start mb-4">
              <AlertTriangle size={20} className="bg-white/20 p-1 rounded-lg" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">库存预警</span>
           </div>
           <p className="text-2xl font-black">{lowStockCount} 项异常</p>
        </div>
        <div className="p-6 bg-slate-900 rounded-[2rem] shadow-lg shadow-slate-200 text-white hidden lg:block">
           <div className="flex justify-between items-start mb-4">
              <RefreshCcw size={20} className="bg-white/20 p-1 rounded-lg" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">参考汇率</span>
           </div>
           <p className="text-2xl font-black">1 : {exchangeRate}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-[350px]">
          <h3 className="text-sm font-black mb-6 text-slate-700 uppercase tracking-widest">领用去向统计</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={outboundData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {outboundData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="hidden lg:flex bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-[350px] items-center justify-center text-slate-300">
           <div className="text-center">
              <BarChartIcon size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">分析模块加载中</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function InventoryGrid({ items, exchangeRate, onThresholdUpdate, onDelete }: any) {
  return (
    <div className="bg-white rounded-[2rem] shadow-md border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
            <tr><th className="px-6 py-5">产品 & 编号</th><th className="px-6 py-5 text-right">参考价 (AUD)</th><th className="px-6 py-5 text-center">当前库存</th><th className="px-6 py-5 text-center">预警线</th><th className="px-6 py-5"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {items.map((item: InventoryItem) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-black text-slate-800">{item.name}</div>
                  <div className="text-[10px] font-mono text-slate-300 uppercase">{item.id}</div>
                </td>
                <td className="px-6 py-4 text-right font-black">A${(item.currency === 'AUD' ? item.currentPrice : item.currentPrice / exchangeRate).toFixed(2)}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1.5 rounded-xl font-black ${item.stockQuantity <= item.threshold ? 'bg-rose-100 text-rose-600' : 'bg-blue-600 text-white'}`}>{item.stockQuantity}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <input type="number" className="w-12 p-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-black" value={item.threshold} onChange={(e) => onThresholdUpdate(item.id, Number(e.target.value))} />
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => onDelete(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const product = catalog.find((p: any) => p.id === selectedId);
  useEffect(() => { if (product) setPrice(product.currentPrice || product.defaultPrice); }, [selectedId]);

  return (
    <div className="max-w-xl mx-auto bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4">
      <h3 className="text-xl font-black mb-8 text-slate-800 uppercase tracking-tight flex items-center gap-2"><PlusCircle className="text-blue-600" /> 采购进货单</h3>
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">产品</label>
          <select className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- 请选择 --</option>
            {catalog.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">数量</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">单价</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
        </div>
        <button disabled={!selectedId} onClick={() => onSubmit(selectedId, qty, price, '采购', new Date().toISOString().split('T')[0])} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">确认入库</button>
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
    <div className="max-w-xl mx-auto bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4">
      <h3 className="text-xl font-black mb-8 text-slate-800 uppercase tracking-tight flex items-center gap-2"><MinusCircle className="text-rose-500" /> 出库领用单</h3>
      <div className="space-y-6">
        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">产品</label><select className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- 请选择 --</option>
            {catalog.filter((p:any)=>p.stockQuantity>0).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">数量</label><input type="number" max={product?.stockQuantity} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">用途</label><select className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black" value={type} onChange={(e) => setType(e.target.value as OutboundType)}>
              {Object.values(OutboundType).map(v => <option key={v} value={v}>{v}</option>)}
            </select></div>
        </div>
        <button disabled={!selectedId} onClick={() => onSubmit(selectedId, qty, type, '', new Date().toISOString().split('T')[0])} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">确认出库</button>
      </div>
    </div>
  );
}

function TransactionHistory({ transactions }: any) {
  return (
    <div className="bg-white rounded-[2rem] shadow-md border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[500px]">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
            <tr><th className="px-6 py-5">时间 & 产品</th><th className="px-6 py-5">流水类型</th><th className="px-6 py-5 text-right">数量变动</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {transactions.map((t: Transaction) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4"><div className="text-[9px] font-black text-slate-400 mb-0.5 uppercase">{t.date}</div><div className="font-bold text-slate-800">{t.productName}</div></td>
                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.type === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{t.type === 'inbound' ? '采购进货' : '出库领用'}</span></td>
                <td className={`px-6 py-4 text-right font-black text-base ${t.type === 'inbound' ? 'text-blue-600' : 'text-slate-400'}`}>{t.type === 'inbound' ? `+${t.quantity}` : `-${t.quantity}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
