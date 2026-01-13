
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  MinusCircle, 
  History, 
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Search,
  CheckCircle2,
  Filter,
  User,
  Tag,
  RefreshCcw,
  Settings,
  BellRing,
  Globe,
  Trash2,
  Plus,
  X,
  ChevronDown,
  Download,
  Upload,
  Share2,
  MonitorSmartphone,
  ExternalLink,
  Info,
  Maximize2,
  RefreshCw,
  AlertCircle,
  Link2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { USANA_CATALOG } from './catalog';
import { 
  AppData, 
  InventoryItem, 
  InboundMethod, 
  OutboundType, 
  Transaction,
  Product
} from './types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('usana_inventory_v6');
    if (saved) return JSON.parse(saved);
    
    const initialInventory: Record<string, InventoryItem> = {};
    USANA_CATALOG.forEach(p => {
      initialInventory[p.id] = {
        ...p,
        currentPrice: p.defaultPrice,
        stockQuantity: 0,
        threshold: 1
      };
    });
    return { inventory: initialInventory, transactions: [], exchangeRate: 4.6 };
  });

  const [activeTab, setActiveTab] = useState<'dash' | 'inv' | 'in' | 'out' | 'hist' | 'settings'>('dash');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    localStorage.setItem('usana_inventory_v6', JSON.stringify(data));
  }, [data]);

  const exchangeRate = data.exchangeRate || 4.6;
  
  const inventoryList = useMemo(() => {
    return Object.values(data.inventory).sort((a: InventoryItem, b: InventoryItem) => {
      if (a.currency === 'AUD' && b.currency !== 'AUD') return -1;
      if (a.currency !== 'AUD' && b.currency === 'AUD') return 1;
      return a.id.localeCompare(b.id);
    });
  }, [data.inventory]);

  const lowStockItems = useMemo(() => inventoryList.filter(item => item.stockQuantity <= item.threshold), [inventoryList]);
  
  const totalValueAUD = useMemo(() => 
    inventoryList.reduce((acc, item) => {
      const priceAUD = item.currency === 'AUD' ? item.currentPrice : item.currentPrice / exchangeRate;
      return acc + (item.stockQuantity * priceAUD);
    }, 0)
  , [inventoryList, exchangeRate]);
  
  const outboundStats = useMemo(() => {
    const stats: Record<string, number> = {};
    data.transactions
      .filter(t => t.type === 'outbound')
      .forEach(t => {
        stats[t.detail] = (stats[t.detail] || 0) + t.quantity;
      });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [data.transactions]);

  const filteredInventory = useMemo(() => {
    return inventoryList.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryList, searchTerm]);

  const handleInbound = (productId: string, quantity: number, price: number, method: string, date: string) => {
    const product = data.inventory[productId];
    if (!product) return;
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      productId,
      productName: product.name,
      date,
      quantity,
      price,
      currency: product.currency,
      type: 'inbound',
      detail: method
    };

    setData(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [productId]: {
          ...product,
          currentPrice: price,
          stockQuantity: product.stockQuantity + quantity
        }
      },
      transactions: [newTransaction, ...prev.transactions]
    }));
    setActiveTab('inv');
  };

  const handleOutbound = (productId: string, quantity: number, type: string, note: string, date: string) => {
    const product = data.inventory[productId];
    if (!product) return;
    if (product.stockQuantity < quantity) {
      alert('库存不足！');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      productId,
      productName: product.name,
      date,
      quantity,
      price: product.currentPrice,
      currency: product.currency,
      type: 'outbound',
      detail: type,
      note: note
    };

    setData(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [productId]: {
          ...product,
          stockQuantity: product.stockQuantity - quantity
        }
      },
      transactions: [newTransaction, ...prev.transactions]
    }));
    setActiveTab('inv');
  };

  const updateThreshold = (id: string, val: number) => {
    setData(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [id]: { ...prev.inventory[id], threshold: val }
      }
    }));
  };

  const updateRate = (val: number) => {
    setData(prev => ({ ...prev, exchangeRate: val }));
  };

  const addManualProduct = (p: Product) => {
    if (data.inventory[p.id]) {
      alert('产品编号已存在！');
      return;
    }
    setData(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [p.id]: {
          ...p,
          currentPrice: p.defaultPrice,
          stockQuantity: 0,
          threshold: 1
        }
      }
    }));
  };

  const deleteProduct = (id: string) => {
    const item = data.inventory[id];
    if (item.stockQuantity > 0) {
      if (!confirm('该产品目前还有库存，确定要删除吗？（相关交易记录将保留）')) return;
    } else {
      if (!confirm('确定要从产品列表中删除该项吗？')) return;
    }
    
    setData(prev => {
      const nextInventory = { ...prev.inventory };
      delete nextInventory[id];
      return { ...prev, inventory: nextInventory };
    });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usana_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.inventory && imported.transactions) {
          if (confirm('导入数据将覆盖当前所有数据（包括汇率和交易记录），是否继续？')) {
            setData(imported);
            alert('数据导入成功！');
          }
        } else {
          alert('无效的数据格式！');
        }
      } catch (err) {
        alert('文件读取失败，请确保是有效的 JSON 备份文件。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <nav className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tighter">USANA PRO</h1>
              <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <Globe size={10}/> GLOBAL INV
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 px-4 space-y-1">
          <NavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={20}/>} label="数据报表" />
          <NavItem active={activeTab === 'inv'} onClick={() => setActiveTab('inv')} icon={<Package size={20}/>} label="库存清单" />
          <NavItem active={activeTab === 'in'} onClick={() => setActiveTab('in')} icon={<PlusCircle size={20}/>} label="采购进货" />
          <NavItem active={activeTab === 'out'} onClick={() => setActiveTab('out')} icon={<MinusCircle size={20}/>} label="出库使用" />
          <NavItem active={activeTab === 'hist'} onClick={() => setActiveTab('hist')} icon={<History size={20}/>} label="操作记录" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="系统设置" />
        </div>

        {lowStockItems.length > 0 && (
          <div className="m-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 animate-pulse shadow-sm">
            <div className="flex items-center gap-2 text-rose-600 font-black mb-1">
              <AlertTriangle size={16} />
              <span className="text-[10px] uppercase tracking-widest">LOW STOCK</span>
            </div>
            <p className="text-[11px] text-rose-500 leading-tight font-medium">
              有 {lowStockItems.length} 件产品需立即补货
            </p>
          </div>
        )}
      </nav>

      <main className="flex-1 overflow-auto">
        <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200 px-10 py-5 sticky top-0 z-10 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {activeTab === 'dash' && 'Dashboard 概览'}
            {activeTab === 'inv' && 'Inventory 库存'}
            {activeTab === 'in' && 'Inbound 进货'}
            {activeTab === 'out' && 'Outbound 出库'}
            {activeTab === 'hist' && 'History 历史'}
            {activeTab === 'settings' && 'Settings 设置'}
          </h2>
          <div className="flex items-center gap-4">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="搜索产品或编号..." 
                  className="pl-11 pr-5 py-3 bg-slate-100/50 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 border-none w-80 transition-all font-semibold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </header>

        <div className="p-10 pb-32 max-w-[1600px] mx-auto">
          {activeTab === 'dash' && (
            <Dashboard 
              totalValueAUD={totalValueAUD} 
              lowStockCount={lowStockItems.length} 
              outboundData={outboundStats} 
              inventory={inventoryList}
              exchangeRate={exchangeRate}
            />
          )}
          {activeTab === 'inv' && (
            <InventoryGrid 
              items={filteredInventory} 
              exchangeRate={exchangeRate} 
              onThresholdUpdate={updateThreshold} 
              onDelete={deleteProduct}
            />
          )}
          {activeTab === 'in' && <InboundForm catalog={inventoryList} onSubmit={handleInbound} />}
          {activeTab === 'out' && <OutboundForm catalog={inventoryList} onSubmit={handleOutbound} />}
          {activeTab === 'hist' && <TransactionHistory transactions={data.transactions} exchangeRate={exchangeRate} />}
          {activeTab === 'settings' && (
            <SettingsPanel 
              currentRate={exchangeRate} 
              onRateUpdate={updateRate} 
              onAddProduct={addManualProduct}
              onExport={exportData}
              onImport={importData}
            />
          )}
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 flex justify-around p-3 md:hidden z-50">
        <MobileNavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={24}/>} />
        <MobileNavItem active={activeTab === 'inv'} onClick={() => setActiveTab('inv')} icon={<Package size={24}/>} />
        <MobileNavItem active={activeTab === 'in'} onClick={() => setActiveTab('in')} icon={<PlusCircle size={24}/>} />
        <MobileNavItem active={activeTab === 'out'} onClick={() => setActiveTab('out')} icon={<MinusCircle size={24}/>} />
        <MobileNavItem active={activeTab === 'hist'} onClick={() => setActiveTab('hist')} icon={<History size={24}/>} />
        <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={24}/>} />
      </nav>
    </div>
  );
}

function ProductSelector({ label, items, value, onChange, placeholder }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItem = useMemo(() => items.find((i: any) => i.id === value), [items, value]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((i: any) => 
      i.name.toLowerCase().includes(s) || 
      i.id.toLowerCase().includes(s)
    );
  }, [items, search]);

  return (
    <div className="space-y-4 relative" ref={wrapperRef}>
      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 cursor-pointer flex items-center justify-between shadow-inner"
      >
        {selectedItem ? (
          <div className="flex items-center gap-2">
             <span className="text-lg">{selectedItem.currency === 'AUD' ? '🇦🇺' : '🇨🇳'}</span>
             <span>{selectedItem.name} <span className="text-slate-300 font-mono text-xs">({selectedItem.id})</span></span>
          </div>
        ) : <span className="text-slate-400">{placeholder}</span>}
        <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              <input 
                autoFocus
                type="text"
                placeholder="键入名称或编号搜索..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-semibold border-none focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? filtered.map((p: any) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                onClick={() => {
                  onChange(p.id);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                <div>
                  <div className="font-bold text-slate-700 group-hover:text-blue-600">{p.name}</div>
                  <div className="text-[10px] font-black text-slate-300 uppercase">{p.id} · {p.category}</div>
                </div>
                <div className="text-xs font-black text-slate-400">{p.currency}</div>
              </button>
            )) : (
              <div className="p-8 text-center text-slate-300 text-xs font-bold uppercase tracking-widest italic">未找到匹配产品</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-500 group ${
        active 
          ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200 scale-105 font-bold' 
          : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'group-hover:rotate-6'} transition-transform duration-500`}>{icon}</div>
      <span className="tracking-tight">{label}</span>
    </button>
  );
}

function MobileNavItem({ active, onClick, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white -translate-y-2 shadow-lg shadow-blue-200' : 'text-slate-400'}`}
    >
      {icon}
    </button>
  );
}

function Dashboard({ totalValueAUD, lowStockCount, outboundData, inventory, exchangeRate }: any) {
  const stockByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    inventory.forEach((item: any) => {
      categories[item.category] = (categories[item.category] || 0) + item.stockQuantity;
    });
    return Object.entries(categories)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [inventory]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <StatCard icon={<DollarSign size={28} />} title="库存估值 (AUD)" value={`A$${totalValueAUD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="emerald" />
        <StatCard icon={<BellRing size={28} />} title="缺货补货项" value={lowStockCount} subtitle="达到阈值" color={lowStockCount > 0 ? "rose" : "blue"} />
        <StatCard icon={<RefreshCcw size={28} />} title="当前汇率" value={`1 : ${exchangeRate}`} subtitle="AUD/CNY" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black mb-10 flex items-center gap-3 uppercase tracking-tighter text-slate-700">
            <Tag className="text-orange-500" size={24}/> 用途消耗统计
          </h3>
          <div className="h-[350px]">
            {outboundData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={outboundData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value" stroke="none">
                    {outboundData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState message="暂无出库明细" />}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black mb-10 flex items-center gap-3 uppercase tracking-tighter text-slate-700">
            <Filter className="text-blue-500" size={24}/> 品类库存分布
          </h3>
          <div className="h-[350px]">
             {stockByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockByCategory} layout="vertical" margin={{left: 30}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 700}} width={120} />
                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="value" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
             ) : <EmptyState message="库房空空如也" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-600 text-white shadow-blue-200',
    rose: 'bg-rose-500 text-white shadow-rose-200',
    emerald: 'bg-emerald-500 text-white shadow-emerald-200',
    indigo: 'bg-indigo-600 text-white shadow-indigo-200',
  };
  return (
    <div className={`p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between h-48 ${colorMap[color]}`}>
      <div className="flex justify-between items-start">
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">{icon}</div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
      </div>
      <div>
        <p className="text-4xl font-black tracking-tighter mb-1">{value}</p>
        {subtitle && <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ message }: any) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-300">
      <Package className="w-16 h-16 opacity-10 mb-4" />
      <span className="text-sm font-black uppercase tracking-widest opacity-30">{message}</span>
    </div>
  );
}

function InventoryGrid({ items, exchangeRate, onThresholdUpdate, onDelete }: any) {
  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
            <tr>
              <th className="px-10 py-8">产品信息</th>
              <th className="px-10 py-8 text-right">进价估值 (AUD)</th>
              <th className="px-10 py-8 text-right">原始货币价</th>
              <th className="px-10 py-8 text-center">库存量</th>
              <th className="px-10 py-8 text-center">报警值</th>
              <th className="px-10 py-8">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item: InventoryItem) => {
              const isLow = item.stockQuantity <= item.threshold;
              const priceAUD = item.currency === 'AUD' ? item.currentPrice : item.currentPrice / exchangeRate;
              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-10 py-6">
                    <div className="font-black text-slate-800 text-base mb-1 group-hover:text-blue-600 transition-colors">{item.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-slate-300">{item.id}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${item.currency === 'AUD' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.currency === 'AUD' ? 'AU 澳洲' : 'CN 中国'}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className="text-slate-900 font-black text-lg tabular-nums">A${priceAUD.toFixed(2)}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className="text-slate-400 font-bold text-xs tabular-nums">
                      {item.currency === 'AUD' ? '---' : `¥${item.currentPrice.toFixed(2)}`}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className={`inline-flex items-center justify-center min-w-[3.5rem] h-11 rounded-2xl font-black text-lg shadow-inner ${
                      isLow ? 'bg-rose-100 text-rose-600' : 'bg-blue-600 text-white'
                    }`}>
                      {item.stockQuantity}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <input 
                      type="number" min="0"
                      className="w-16 p-2 bg-slate-100 border-none rounded-xl text-center font-black text-sm focus:ring-2 focus:ring-blue-500/20"
                      value={item.threshold}
                      onChange={(e) => onThresholdUpdate(item.id, Number(e.target.value))}
                    />
                  </td>
                  <td className="px-10 py-6">
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [method, setMethod] = useState<string>(InboundMethod.AUTO_ORDER);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedProduct = useMemo(() => catalog.find((i: any) => i.id === selectedId), [selectedId, catalog]);

  useEffect(() => {
    if (selectedProduct) setPrice(selectedProduct.defaultPrice);
  }, [selectedProduct]);

  const symbol = selectedProduct?.currency === 'AUD' ? 'A$' : '¥';

  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(selectedId, quantity, price, method, date); }} className="space-y-10">
        <ProductSelector 
          label="搜索并选择采购产品"
          items={catalog}
          value={selectedId}
          onChange={setSelectedId}
          placeholder="点击搜索产品名称或编号..."
        />

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">进货数量</label>
            <input type="number" min="1" required className="w-full p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-black text-2xl shadow-inner" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">单价 ({selectedProduct?.currency || '货币'})</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">{symbol}</span>
              <input type="number" step="0.01" required className="w-full pl-14 p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-black text-2xl text-emerald-600 shadow-inner" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">进货日期</label>
            <input type="date" required className="w-full p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-bold shadow-inner" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">采购渠道</label>
            <select className="w-full p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-bold shadow-inner" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value={InboundMethod.AUTO_ORDER}>自动订货</option>
              <option value={InboundMethod.SINGLE_ORDER}>单次订货</option>
              <option value={InboundMethod.GIFT}>赠品/其它</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-4">
          <PlusCircle size={28} /> 入库并同步数据
        </button>
      </form>
    </div>
  );
}

function OutboundForm({ catalog, onSubmit }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<string>(OutboundType.SELF);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const availableItems = useMemo(() => catalog.filter((c: any) => c.stockQuantity > 0), [catalog]);

  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(selectedId, quantity, type, note, date); }} className="space-y-10">
        <ProductSelector 
          label="搜索并选择待出库产品"
          items={availableItems}
          value={selectedId}
          onChange={setSelectedId}
          placeholder="点击搜索库存中的产品..."
        />

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">出库数量</label>
            <input type="number" min="1" required className="w-full p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-black text-2xl shadow-inner" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">出库用途</label>
            <select className="w-full p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-bold shadow-inner" value={type} onChange={(e) => setType(e.target.value)}>
              <option value={OutboundType.SELF}>自用 Personal</option>
              <option value={OutboundType.KIDS}>孩子用 Kids</option>
              <option value={OutboundType.LOANED}>借出 Loaned</option>
              <option value={OutboundType.SOLD}>售出 Sold</option>
              <option value="其他">其它 Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <User size={14} className="text-blue-500"/> 备注/借出人信息
          </label>
          <input type="text" placeholder="借出时请务必填写借出方姓名..." className="w-full p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-semibold shadow-inner" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">出库日期</label>
          <input type="date" required className="w-full p-6 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-500/10 font-bold shadow-inner" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <button type="submit" className="w-full py-8 bg-orange-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-orange-200 hover:bg-orange-700 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-4">
          <MinusCircle size={28} /> 确认并减少库存
        </button>
      </form>
    </div>
  );
}

function TransactionHistory({ transactions, exchangeRate }: any) {
  if (transactions.length === 0) return <EmptyState message="暂无历史交易数据" />;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {transactions.map((t: Transaction) => {
        const valueAUD = t.currency === 'AUD' ? t.price * t.quantity : (t.price * t.quantity) / exchangeRate;
        const symbol = t.currency === 'AUD' ? 'A$' : '¥';
        return (
          <div key={t.id} className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-2xl transition-all duration-500 group">
            <div className="flex items-center gap-10">
              <div className={`p-8 rounded-[2rem] shadow-inner ${t.type === 'inbound' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                {t.type === 'inbound' ? <PlusCircle size={32}/> : <MinusCircle size={32}/>}
              </div>
              <div>
                <div className="font-black text-slate-800 text-2xl leading-none mb-4 group-hover:text-blue-600 transition-colors">{t.productName}</div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-mono text-[10px] bg-slate-100 px-4 py-1 rounded-full text-slate-500 font-black">{t.productId}</span>
                  <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{t.date}</span>
                  <span className={`text-[10px] px-4 py-1 rounded-full font-black uppercase tracking-widest ${t.type === 'inbound' ? 'bg-emerald-600 text-white' : 'bg-orange-600 text-white'}`}>
                    {t.detail}
                  </span>
                  {t.note && (
                    <span className="text-[11px] flex items-center gap-2 text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full font-black italic">
                      <User size={14}/> {t.note}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-black tracking-tighter tabular-nums ${t.type === 'inbound' ? 'text-emerald-600' : 'text-orange-600'}`}>
                {t.type === 'inbound' ? '+' : '-'}{t.quantity}
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-[10px] text-slate-300 font-black uppercase tracking-widest">AUD: A${valueAUD.toFixed(2)}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Price: {symbol}{t.price.toFixed(2)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingsPanel({ currentRate, onRateUpdate, onAddProduct, onExport, onImport }: any) {
  const [newP, setNewP] = useState<Product>({ id: '', name: '', category: '自定义', defaultPrice: 0, currency: 'AUD' });
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newP.id || !newP.name) return;
    onAddProduct(newP);
    setNewP({ id: '', name: '', category: '自定义', defaultPrice: 0, currency: 'AUD' });
    setShowForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in zoom-in-95 duration-500">
       
       <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100">
         <h3 className="text-2xl font-black mb-8 flex items-center gap-4 text-slate-800 tracking-tighter uppercase">
           <RefreshCcw className="text-blue-500 w-8 h-8" />
           通用财务配置
         </h3>
         <div className="space-y-5">
           <label className="block text-sm font-black text-slate-400 uppercase tracking-[0.2em] ml-2">汇率锚定 (1 AUD 兑换 人民币)</label>
           <div className="flex items-center gap-8 p-6 bg-slate-50 rounded-[2.5rem] border-4 border-slate-100 group focus-within:border-blue-500 transition-all">
              <span className="text-slate-400 font-black text-lg uppercase tracking-widest">1 AUD = </span>
              <input 
                type="number" step="0.01"
                className="flex-1 bg-transparent border-none focus:ring-0 font-black text-4xl text-blue-600 placeholder-slate-200"
                value={currentRate}
                onChange={(e) => onRateUpdate(Number(e.target.value))}
              />
              <span className="text-slate-400 font-black text-lg uppercase tracking-widest">CNY</span>
           </div>
         </div>
       </div>

       <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100">
         <div className="flex items-center justify-between mb-8">
           <h3 className="text-2xl font-black flex items-center gap-4 text-slate-800 tracking-tighter uppercase">
             <Package className="text-emerald-500 w-8 h-8" />
             产品目录管理
           </h3>
           <button 
             onClick={() => setShowForm(!showForm)}
             className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
           >
             {showForm ? <X size={18}/> : <Plus size={18}/>}
             {showForm ? '取消添加' : '手动新增产品'}
           </button>
         </div>

         {showForm && (
           <form onSubmit={handleSubmit} className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-8 animate-in slide-in-from-top-4 duration-500 mb-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">产品编号 (Unique ID)</label>
                  <input required placeholder="例如: AU-001" className="w-full p-4 bg-white border-none rounded-2xl font-bold shadow-inner" value={newP.id} onChange={(e) => setNewP({...newP, id: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">产品名称</label>
                  <input required placeholder="输入完整名称" className="w-full p-4 bg-white border-none rounded-2xl font-bold shadow-inner" value={newP.name} onChange={(e) => setNewP({...newP, name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">分类</label>
                  <input required className="w-full p-4 bg-white border-none rounded-2xl font-bold shadow-inner" value={newP.category} onChange={(e) => setNewP({...newP, category: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">默认货币</label>
                  <select className="w-full p-4 bg-white border-none rounded-2xl font-bold shadow-inner" value={newP.currency} onChange={(e) => setNewP({...newP, currency: e.target.value as 'AUD' | 'CNY'})}>
                    <option value="AUD">澳洲 AUD</option>
                    <option value="CNY">中国 CNY</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">参考标价</label>
                  <input type="number" required className="w-full p-4 bg-white border-none rounded-2xl font-black shadow-inner" value={newP.defaultPrice} onChange={(e) => Number(e.target.value) >= 0 && setNewP({...newP, defaultPrice: Number(e.target.value)})} />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">
                确认录入新产品
              </button>
           </form>
         )}
         <p className="text-xs text-slate-400 font-bold italic mb-0">可在“库存清单”页删除产品。</p>
       </div>

       <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100">
         <h3 className="text-2xl font-black mb-8 flex items-center gap-4 text-slate-800 tracking-tighter uppercase">
           <Share2 className="text-indigo-500 w-8 h-8" />
           数据备份与分享 (本地独立存储)
         </h3>
         <div className="grid grid-cols-2 gap-8">
           <button 
             onClick={onExport}
             className="flex flex-col items-center justify-center p-8 bg-indigo-50 rounded-[2.5rem] border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-all group"
           >
             <Download className="mb-3 group-hover:translate-y-1 transition-transform" size={32} />
             <span className="font-black text-sm uppercase tracking-widest">导出备份数据</span>
             <span className="text-[10px] opacity-60 mt-1 uppercase">JSON Format</span>
           </button>
           
           <div className="relative">
             <input 
               type="file" 
               accept=".json" 
               className="hidden" 
               ref={fileInputRef} 
               onChange={onImport}
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="w-full h-full flex flex-col items-center justify-center p-8 bg-blue-50 rounded-[2.5rem] border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-100 transition-all group"
             >
               <Upload className="mb-3 group-hover:-translate-y-1 transition-transform" size={32} />
               <span className="font-black text-sm uppercase tracking-widest">导入历史数据</span>
               <span className="text-[10px] opacity-60 mt-1 uppercase">Overwrite Current</span>
             </button>
           </div>
         </div>
         <p className="mt-6 text-xs text-slate-400 font-medium leading-relaxed">
           由于数据仅保存在手机浏览器本地，分享 App 链接本身不会分享数据。如果您想把自己的库存设置分享给朋友，可以先导出数据文件，通过微信发给朋友，让他们在设置中导入即可。
         </p>
       </div>
    </div>
  );
}
