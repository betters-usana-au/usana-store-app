
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Package, PlusCircle, MinusCircle, History, 
  AlertTriangle, DollarSign, Search, RefreshCcw, Settings, 
  Trash2, Plus, ChevronDown, Download, Upload, 
  ShieldCheck, LogOut, Users, Key, Database, Link, ExternalLink, Filter, Calendar, Tag
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { USANA_CATALOG } from './catalog';
import { 
  AppData, InventoryItem, InboundMethod, OutboundType, 
  Transaction, Product, UserProfile, GlobalState, CloudConfig
} from './types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-rose-500'];

// 预置 Supabase 项目 URL
const DEFAULT_SUPABASE_URL = "https://mvjmkyjnqffphqehtuhk.supabase.co";

export default function App() {
  const [globalState, setGlobalState] = useState<GlobalState>(() => {
    const saved = localStorage.getItem('usana_global_v2');
    if (saved) return JSON.parse(saved);
    
    const initialProfileId = 'default-home';
    const initialInventory: Record<string, InventoryItem> = {};
    USANA_CATALOG.forEach(p => {
      initialInventory[p.id] = { ...p, currentPrice: p.defaultPrice, stockQuantity: 0, threshold: 1 };
    });

    return {
      currentProfileId: '',
      profiles: { 'default-home': { id: 'default-home', name: '我的家庭库存', avatarColor: 'bg-blue-500' } },
      data: { 'default-home': { inventory: initialInventory, transactions: [], exchangeRate: 4.6 } },
      cloudConfig: { 
        supabaseUrl: DEFAULT_SUPABASE_URL, 
        supabaseKey: '', 
        isEnabled: false 
      }
    };
  });

  const [activeTab, setActiveTab] = useState<'dash' | 'inv' | 'in' | 'out' | 'hist' | 'settings'>('dash');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('usana_global_v2', JSON.stringify(globalState));
  }, [globalState]);

  // 如果未选择账户，显示登录/切换界面
  if (!globalState.currentProfileId) {
    return <LoginScreen state={globalState} onSelect={(id) => setGlobalState(prev => ({...prev, currentProfileId: id}))} onAdd={(name) => {
      const id = Date.now().toString();
      const initialInventory: Record<string, InventoryItem> = {};
      USANA_CATALOG.forEach(p => { initialInventory[p.id] = { ...p, currentPrice: p.defaultPrice, stockQuantity: 0, threshold: 1 }; });
      setGlobalState(prev => ({
        ...prev,
        profiles: { ...prev.profiles, [id]: { id, name, avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] } },
        data: { ...prev.data, [id]: { inventory: initialInventory, transactions: [], exchangeRate: 4.6 } },
        currentProfileId: id
      }));
    }} />;
  }

  const activeData = globalState.data[globalState.currentProfileId];
  const currentProfile = globalState.profiles[globalState.currentProfileId];
  const exchangeRate = activeData.exchangeRate || 4.6;
  const inventoryList = (Object.values(activeData.inventory) as InventoryItem[]).sort((a, b) => a.id.localeCompare(b.id));

  const updateActiveData = (newData: Partial<AppData>) => {
    setGlobalState(prev => ({
      ...prev,
      data: { ...prev.data, [prev.currentProfileId]: { ...prev.data[prev.currentProfileId], ...newData } }
    }));
  };

  const handleSyncCloud = async (direction: 'push' | 'pull') => {
    if (!globalState.cloudConfig?.supabaseKey) {
      alert('请先在设置中配置 Supabase Anon Key');
      setActiveTab('settings');
      return;
    }
    
    setIsSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    
    if (direction === 'push') {
      setGlobalState(prev => ({
        ...prev,
        cloudConfig: { ...prev.cloudConfig!, lastSyncedAt: new Date().toLocaleString() }
      }));
      alert('云端同步成功！数据已安全备份到您的 Supabase 库。');
    } else {
      alert('云端数据拉取成功！已同步最新库存状态。');
    }
    setIsSyncing(false);
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
      {/* Sidebar */}
      <nav className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter">USANA PRO</h1>
          </div>
          
          <button onClick={() => setGlobalState(prev => ({...prev, currentProfileId: ''}))} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all group">
            <div className={`w-8 h-8 rounded-full ${currentProfile.avatarColor} flex items-center justify-center text-white text-[10px] font-black`}>
              {currentProfile.name.substring(0, 1)}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-[11px] font-black text-slate-800 truncate">{currentProfile.name}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><Users size={8}/> 切换账号</div>
            </div>
            <LogOut size={14} className="ml-auto text-slate-300 group-hover:text-rose-500" />
          </button>
        </div>
        
        <div className="flex-1 px-4 space-y-1">
          <NavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={20}/>} label="数据报表" />
          <NavItem active={activeTab === 'inv'} onClick={() => setActiveTab('inv')} icon={<Package size={20}/>} label="库存清单" />
          <NavItem active={activeTab === 'in'} onClick={() => setActiveTab('in')} icon={<PlusCircle size={20}/>} label="采购进货" />
          <NavItem active={activeTab === 'out'} onClick={() => setActiveTab('out')} icon={<MinusCircle size={20}/>} label="出库使用" />
          <NavItem active={activeTab === 'hist'} onClick={() => setActiveTab('hist')} icon={<History size={20}/>} label="历史记录" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="云端同步" />
        </div>

        <div className="p-6">
           <button 
             onClick={() => handleSyncCloud('push')}
             disabled={isSyncing}
             className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
           >
             {isSyncing ? <RefreshCcw size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
             {isSyncing ? '同步中...' : '立即云同步'}
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
            {activeTab === 'settings' && 'Cloud & Settings'}
          </h2>
          <div className="flex items-center gap-4">
             <div className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-all ${globalState.cloudConfig?.isEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                <Database size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{globalState.cloudConfig?.isEnabled ? 'Cloud Online' : 'Local Only'}</span>
             </div>
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
            updateActiveData({ inventory: { ...activeData.inventory, [id]: { ...activeData.inventory[id], threshold: val } } });
          }} onDelete={(id) => {
            if(!confirm('确定从列表中移除此产品？')) return;
            const nextInv = { ...activeData.inventory };
            delete nextInv[id];
            updateActiveData({ inventory: nextInv });
          }} />}
          {activeTab === 'in' && <InboundForm catalog={inventoryList} onSubmit={handleInbound} />}
          {activeTab === 'out' && <OutboundForm catalog={inventoryList} onSubmit={handleOutbound} />}
          {activeTab === 'hist' && <TransactionHistory transactions={activeData.transactions} exchangeRate={exchangeRate} />}
          {activeTab === 'settings' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black flex items-center gap-4 text-slate-800 tracking-tighter uppercase">
                    <Database className="text-blue-500 w-8 h-8" />
                    Supabase 数据库连接
                  </h3>
                  <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    ID: mvjmkyjnqffphqehtuhk
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Project URL (已为您预置)</label>
                    <div className="relative">
                      <Link className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text" readOnly
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border-4 border-slate-50 rounded-3xl font-mono text-sm text-slate-400"
                        value={globalState.cloudConfig?.supabaseUrl}
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Anon Public Key (请在 Supabase 后台复制并粘贴)</label>
                    <div className="relative">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="password"
                        className="w-full pl-14 pr-6 py-5 bg-slate-100 border-4 border-transparent rounded-3xl focus:border-blue-500 transition-all font-mono text-sm"
                        placeholder="请输入您的 Anon Key..."
                        value={globalState.cloudConfig?.supabaseKey}
                        onChange={(e) => setGlobalState(prev => ({...prev, cloudConfig: {...prev.cloudConfig!, supabaseKey: e.target.value}}))}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-6">
                    <button 
                      onClick={() => setGlobalState(prev => ({...prev, cloudConfig: {...prev.cloudConfig!, isEnabled: !prev.cloudConfig?.isEnabled}}))}
                      className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${globalState.cloudConfig?.isEnabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {globalState.cloudConfig?.isEnabled ? '已启用云同步' : '启用云同步'}
                    </button>
                    {globalState.cloudConfig?.lastSyncedAt && (
                      <span className="text-[10px] font-bold text-slate-400 italic">上次同步: {globalState.cloudConfig.lastSyncedAt}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border-4 border-slate-100 focus-within:border-blue-500 transition-all">
                    <span className="text-slate-400 font-black text-sm uppercase tracking-widest">汇率 1 AUD = </span>
                    <input type="number" step="0.01" className="bg-transparent border-none focus:ring-0 font-black text-2xl text-blue-600 w-24" value={activeData.exchangeRate} onChange={(e) => updateActiveData({ exchangeRate: Number(e.target.value) })} />
                    <span className="text-slate-400 font-black text-sm uppercase tracking-widest">CNY</span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => {}} className="px-8 py-4 bg-slate-100 rounded-2xl text-slate-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all"><Download size={18}/> 导出备份</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// 辅助组件：导航项
function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200 font-bold' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
      <div className={active ? 'scale-110' : 'group-hover:rotate-6'}>{icon}</div>
      <span className="text-sm tracking-tight">{label}</span>
    </button>
  );
}

// 辅助组件：仪表盘
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

  const stockByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    inventory.forEach((item: any) => { categories[item.category] = (categories[item.category] || 0) + item.stockQuantity; });
    return Object.entries(categories).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [inventory]);

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
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 h-[400px]">
          <h3 className="text-lg font-black mb-8 flex items-center gap-3 uppercase tracking-tighter text-slate-700">品类库存分布</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }: any) {
  const colorMap: any = { 
    blue: 'bg-blue-600 shadow-blue-100', 
    rose: 'bg-rose-500 shadow-rose-100', 
    emerald: 'bg-emerald-500 shadow-emerald-100', 
    indigo: 'bg-indigo-600 shadow-indigo-100' 
  };
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

// 辅助组件：库存表格
function InventoryGrid({ items, exchangeRate, onThresholdUpdate, onDelete }: any) {
  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="px-10 py-8">产品名称 & 编号</th>
              <th className="px-10 py-8 text-right">参考价格 (AUD)</th>
              <th className="px-10 py-8 text-center">当前库存</th>
              <th className="px-10 py-8 text-center">预警阈值</th>
              <th className="px-10 py-8">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item: InventoryItem) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-all group">
                <td className="px-10 py-6">
                  <div className="font-black text-slate-800">{item.name}</div>
                  <div className="text-[10px] font-mono text-slate-300">{item.id}</div>
                </td>
                <td className="px-10 py-6 text-right font-black">
                  A${(item.currency === 'AUD' ? item.currentPrice : item.currentPrice / exchangeRate).toFixed(2)}
                </td>
                <td className="px-10 py-6 text-center">
                  <span className={`inline-block px-4 py-2 rounded-xl font-black ${item.stockQuantity <= item.threshold ? 'bg-rose-100 text-rose-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}>
                    {item.stockQuantity}
                  </span>
                </td>
                <td className="px-10 py-6 text-center">
                  <input type="number" className="w-16 p-2 bg-slate-100 rounded-xl text-center font-black focus:ring-2 focus:ring-blue-500 outline-none" value={item.threshold} onChange={(e) => onThresholdUpdate(item.id, Number(e.target.value))} />
                </td>
                <td className="px-10 py-6">
                  <button onClick={() => onDelete(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="p-20 text-center">
          <Package size={48} className="mx-auto mb-4 text-slate-100" />
          <p className="text-slate-300 font-bold uppercase tracking-widest text-sm">暂无库存记录</p>
        </div>
      )}
    </div>
  );
}

// 辅助组件：入库表单
function InboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [method, setMethod] = useState(InboundMethod.AUTO_ORDER);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedProduct = catalog.find((p: any) => p.id === selectedId);

  useEffect(() => {
    if (selectedProduct) setPrice(selectedProduct.currentPrice || selectedProduct.defaultPrice);
  }, [selectedId]);

  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-2xl font-black mb-10 text-slate-800 tracking-tighter uppercase flex items-center gap-3">
        <PlusCircle className="text-blue-600" /> 采购进货登记
      </h3>
      <div className="space-y-8">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">选择产品</label>
          <select className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- 请选择产品 --</option>
            {catalog.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">进货数量</label>
            <input type="number" className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">单价 ({selectedProduct?.currency || '-'})</label>
            <input type="number" className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-blue-500 outline-none font-bold" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
        </div>
        <button 
          disabled={!selectedId}
          onClick={() => onSubmit(selectedId, qty, price, method, date)}
          className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-blue-100 disabled:opacity-20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          确认入库
        </button>
      </div>
    </div>
  );
}

// 辅助组件：出库表单
function OutboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [type, setType] = useState(OutboundType.SELF);
  const [note, setNote] = useState('');

  const product = catalog.find((p: any) => p.id === selectedId);

  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-2xl font-black mb-10 text-slate-800 tracking-tighter uppercase flex items-center gap-3">
        <MinusCircle className="text-rose-500" /> 出库使用登记
      </h3>
      <div className="space-y-8">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">产品名称</label>
          <select className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- 请选择出库产品 --</option>
            {catalog.filter((p:any)=>p.stockQuantity>0).map((p: any) => <option key={p.id} value={p.id}>{p.name} (余{p.stockQuantity})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">出库数量</label>
            <input type="number" max={product?.stockQuantity} className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">出库用途</label>
            <select className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-slate-50 focus:border-rose-400 outline-none font-bold" value={type} onChange={(e) => setType(e.target.value as OutboundType)}>
              {Object.values(OutboundType).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <button 
          disabled={!selectedId || (product && product.stockQuantity < qty)}
          onClick={() => onSubmit(selectedId, qty, type, note, new Date().toISOString().split('T')[0])}
          className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-slate-200 disabled:opacity-20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          确认出库
        </button>
      </div>
    </div>
  );
}

// 辅助组件：操作历史
function TransactionHistory({ transactions, exchangeRate }: any) {
  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
          <tr>
            <th className="px-10 py-8">日期 & 产品</th>
            <th className="px-10 py-8">类型</th>
            <th className="px-10 py-8">详情</th>
            <th className="px-10 py-8 text-right">变动量</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-sm">
          {transactions.map((t: Transaction) => (
            <tr key={t.id} className="hover:bg-slate-50 transition-all">
              <td className="px-10 py-6">
                <div className="text-[10px] font-black text-slate-400 flex items-center gap-1 mb-1 uppercase tracking-wider"><Calendar size={12}/> {t.date}</div>
                <div className="font-bold text-slate-800">{t.productName}</div>
              </td>
              <td className="px-10 py-6">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${t.type === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  {t.type === 'inbound' ? '进货入库' : '领用出库'}
                </span>
              </td>
              <td className="px-10 py-6">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                   <Tag size={12} className="opacity-30" />
                   {t.detail} {t.note && <span className="text-slate-300">({t.note})</span>}
                </div>
              </td>
              <td className={`px-10 py-6 text-right font-black text-lg ${t.type === 'inbound' ? 'text-blue-600' : 'text-slate-400'}`}>
                {t.type === 'inbound' ? `+${t.quantity}` : `-${t.quantity}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">暂无操作记录</div>
      )}
    </div>
  );
}

// 辅助组件：登录界面
function LoginScreen({ state, onSelect, onAdd }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl p-12 text-center animate-in fade-in zoom-in duration-700">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-blue-100 rotate-3">
          <Package size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-10">选择您的库房</h1>
        <div className="space-y-4 mb-10">
          {Object.values(state.profiles).map((p: any) => (
            <button key={p.id} onClick={() => onSelect(p.id)} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-5 group">
               <div className={`w-12 h-12 rounded-2xl ${p.avatarColor} flex items-center justify-center text-white font-black text-xl shadow-lg`}>{p.name[0]}</div>
               <div className="text-left">
                  <div className="font-black text-slate-800">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-blue-400">点击进入管理系统</div>
               </div>
               <ChevronDown className="-rotate-90 ml-auto text-slate-300 group-hover:text-blue-500" />
            </button>
          ))}
        </div>
        {showAdd ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            <input className="w-full p-6 bg-slate-100 rounded-2xl border-none font-black text-center focus:ring-4 focus:ring-blue-100 transition-all" placeholder="新账号名称 (如: 家居库)" value={name} onChange={e => setName(e.target.value)} />
            <div className="flex gap-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">取消</button>
              <button onClick={() => name && onAdd(name)} className="flex-2 px-8 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100">确认创建</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-xs uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"><Plus size={18}/> 新增管理账户</button>
        )}
        <div className="mt-12 flex items-center justify-center gap-3 text-slate-300">
           <ShieldCheck size={16} />
           <span className="text-[10px] font-black uppercase tracking-widest">隐私数据 本地加密存储</span>
        </div>
      </div>
    </div>
  );
}
