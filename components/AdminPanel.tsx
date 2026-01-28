
import React, { useState, useRef, useEffect } from 'react';
import { MenuItem, Category, AppConfig, Order, CartItem } from '../types';
import { supabase } from '../lib/supabase';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: MenuItem[];
  config: AppConfig;
  onRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, 
  onClose, 
  categories, 
  products, 
  config,
  onRefresh
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('admin_session') === 'active');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'branding' | 'products' | 'orders' | 'reports' | 'pos'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [reportOrders, setReportOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showOrderListModal, setShowOrderListModal] = useState(false);
  
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posCategory, setPosCategory] = useState('todo');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'efectivo' | 'yape' | 'plin'>('efectivo');
  const [lastOrderForTicket, setLastOrderForTicket] = useState<Order | null>(null);
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setHours(0,0,0,0)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const slideInputRef = useRef<HTMLInputElement>(null);
  const productImgInputRef = useRef<HTMLInputElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'orders' && isLoggedIn) {
      fetchOrders();
      const channel = supabase.channel('orders_realtime_admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    if (activeTab === 'reports' && isLoggedIn) {
      fetchReportData();
    }
  }, [activeTab, isLoggedIn, dateRange]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoadingOrders(false);
  };

  const fetchReportData = async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .gte('created_at', `${dateRange.start}T00:00:00`)
      .lte('created_at', `${dateRange.end}T23:59:59`)
      .neq('status', 'cancelled'); 
    
    if (data) setReportOrders(data);
    setLoadingReports(false);
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
      fetchOrders();
    } catch (err: any) { alert(err.message); }
  };

  const updatePaymentStatus = async (id: string, payment_status: Order['payment_status']) => {
    try {
      const { error } = await supabase.from('orders').update({ payment_status }).eq('id', id);
      if (error) throw error;
      fetchOrders();
    } catch (err: any) { alert(err.message); }
  };

  const calculateStats = () => {
    const totalSales = reportOrders.reduce((acc, order) => acc + (order.total_amount || 0), 0);
    const orderCount = reportOrders.length;
    const payments = { yape: { count: 0, total: 0 }, plin: { count: 0, total: 0 }, efectivo: { count: 0, total: 0 } };
    const sources = { web: { count: 0, total: 0 }, pos: { count: 0, total: 0 } };
    const productCounts: Record<string, { qty: number, total: number }> = {};
    
    reportOrders.forEach(order => {
      const pm = order.payment_method?.toLowerCase() as keyof typeof payments;
      if (payments[pm]) { payments[pm].count++; payments[pm].total += (order.total_amount || 0); }
      
      const isPOS = order.customer_name === 'Venta Directa Local' || order.address === 'Venta Presencial';
      if (isPOS) { sources.pos.count++; sources.pos.total += (order.total_amount || 0); } 
      else { sources.web.count++; sources.web.total += (order.total_amount || 0); }
      
      const items = order.order_items || order.items || [];
      items.forEach((item: any) => {
        const name = item.product_name || 'Desconocido';
        if (!productCounts[name]) productCounts[name] = { qty: 0, total: 0 };
        productCounts[name].qty += (item.quantity || 0);
        productCounts[name].total += ((item.quantity || 0) * (item.price || 0));
      });
    });
    const topProducts = Object.entries(productCounts).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.qty - a.qty).slice(0, 10);
    return { totalSales, orderCount, topProducts, payments, sources };
  };

  const setQuickFilter = (type: 'today' | 'yesterday' | 'month' | 'last7') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    if (type === 'today') start.setHours(0,0,0,0);
    else if (type === 'yesterday') { start.setDate(today.getDate() - 1); start.setHours(0,0,0,0); end.setDate(today.getDate() - 1); end.setHours(23,59,59,999); } 
    else if (type === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1);
    else if (type === 'last7') start.setDate(today.getDate() - 7);
    setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  };

  const exportToExcel = () => {
    if (reportOrders.length === 0) return alert("No hay datos para exportar.");
    const data = reportOrders.map(o => ({
      ID: o.id.slice(-6).toUpperCase(),
      Fecha: new Date(o.created_at).toLocaleString(),
      Origen: (o.customer_name === 'Venta Directa Local' || o.address === 'Venta Presencial') ? 'POS' : 'Web',
      Cliente: o.customer_name,
      Telefono: o.customer_phone || '',
      Pago: o.payment_method.toUpperCase(),
      Monto: o.total_amount,
      Estado: o.status.toUpperCase()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `Reporte_Chicha_${dateRange.start}.xlsx`);
  };

  const handleUpdateConfig = async (updates: Partial<AppConfig>) => {
    setSaving(true);
    try { await supabase.from('app_config').upsert({ id: 1, ...config, ...updates, updated_at: new Date().toISOString() }); onRefresh(); } 
    catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'product' | 'slide') => {
    const file = e.target.files?.[0]; if (!file) return; setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const filePath = `${type}s/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file); if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      if (type === 'logo') await handleUpdateConfig({ logo_url: finalUrl });
      else if (type === 'product' && editingProduct) setEditingProduct({ ...editingProduct, image_url: finalUrl });
      else if (type === 'slide') await handleUpdateConfig({ slide_urls: [...(config.slide_urls || []), finalUrl] });
    } catch (err: any) { alert(err.message); } finally { setIsUploading(false); }
  };

  const addToPOS = (item: MenuItem) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handlePOSCheckout = async () => {
    if (posCart.length === 0 || saving) return;
    setSaving(true);
    const total = posCart.reduce((s, i) => s + (i.price * i.quantity), 0);
    try {
      const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
        customer_name: 'Venta Directa Local', order_type: 'pickup', payment_method: posPaymentMethod,
        payment_status: 'paid', status: 'completed', total_amount: total, address: 'Venta Presencial'
      }]).select().single();
      if (orderError) throw orderError;
      const orderItemsInsert = posCart.map(item => ({ order_id: orderData.id, product_name: item.name, quantity: item.quantity, price: item.price }));
      await supabase.from('order_items').insert(orderItemsInsert);
      setLastOrderForTicket({ ...orderData, items: orderItemsInsert });
      setShowCheckoutModal(false); setPosCart([]);
    } catch (err: any) { alert(`Error: ${err.message}`); } finally { setSaving(false); }
  };

  const handlePrintTicket = () => {
    if (!ticketRef.current) return;
    const printContent = ticketRef.current.innerHTML;
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900');
    if (!windowPrint) return;
    windowPrint.document.write(`<html><head><title>Ticket CHICHA</title><style>@page { size: 80mm auto; margin: 0; } body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; font-size: 11px; line-height: 1.2; } .center { text-align: center; } .bold { font-weight: bold; } .border-b { border-bottom: 1px dashed black; padding-bottom: 5px; margin-bottom: 5px; } .row { display: flex; justify-content: space-between; margin-bottom: 2px; } img { max-width: 40mm; filter: grayscale(1); margin-bottom: 5px; display: block; margin: 0 auto; }</style></head><body onload="window.print();window.close()">${printContent}</body></html>`);
    windowPrint.document.close();
  };

  if (!isOpen) return null;

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
        <form onSubmit={(e) => { e.preventDefault(); if (password === 'admin123') { setIsLoggedIn(true); sessionStorage.setItem('admin_session', 'active'); } }} className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 text-center shadow-2xl space-y-6">
          <h2 className="font-black brand-font text-2xl uppercase italic tracking-tighter">Panel de Control</h2>
          <input type="password" placeholder="****" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 p-5 rounded-2xl text-center font-black outline-none border-2 border-transparent focus:border-black text-2xl tracking-[0.5em]" autoFocus />
          <button className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase hover:bg-[#ff0095] transition-all">ACCEDER</button>
        </form>
      </div>
    );
  }

  const { totalSales, orderCount, topProducts, payments, sources } = calculateStats();
  const posTotal = posCart.reduce((s, i) => s + (i.price * i.quantity), 0);

  return (
    <div className="fixed inset-0 z-[600] bg-[#f8f7f2] flex flex-col md:flex-row overflow-hidden">
      <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" />
      <input type="file" ref={slideInputRef} onChange={(e) => handleFileUpload(e, 'slide')} className="hidden" />
      <input type="file" ref={productImgInputRef} onChange={(e) => handleFileUpload(e, 'product')} className="hidden" />

      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-56'} bg-white border-r flex flex-col z-20 shadow-sm transition-all duration-300`}>
        <div className="p-8 text-center border-b">
          <h2 className={`text-2xl font-black brand-font italic leading-none ${isSidebarCollapsed ? 'hidden' : 'block'}`}>CHICHA</h2>
          <span className={`text-[7px] font-black uppercase tracking-[0.4em] text-[#ff0095] block mt-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>ADMIN</span>
        </div>
        <nav className="flex flex-col p-3 gap-2 flex-grow mt-4">
          <TabBtn active={activeTab === 'pos'} icon="fa-cash-register" label="POS" onClick={() => setActiveTab('pos')} collapsed={isSidebarCollapsed} />
          <TabBtn active={activeTab === 'orders'} icon="fa-list-check" label="Pedidos" onClick={() => setActiveTab('orders')} collapsed={isSidebarCollapsed} />
          <TabBtn active={activeTab === 'reports'} icon="fa-chart-line" label="Reportes" onClick={() => setActiveTab('reports')} collapsed={isSidebarCollapsed} />
          <TabBtn active={activeTab === 'products'} icon="fa-bowl-rice" label="Carta" onClick={() => setActiveTab('products')} collapsed={isSidebarCollapsed} />
          <TabBtn active={activeTab === 'branding'} icon="fa-sliders" label="Ajustes" onClick={() => setActiveTab('branding')} collapsed={isSidebarCollapsed} />
        </nav>
        <div className="p-4 border-t"><button onClick={onClose} className="w-full p-4 rounded-xl bg-black text-white text-[9px] font-black uppercase hover:bg-[#ff0095] transition-all">SALIR</button></div>
      </div>

      <div className="flex-grow flex flex-col overflow-hidden relative">
        {activeTab === 'reports' && (
           <div className="p-8 h-full overflow-y-auto no-scrollbar animate-reveal bg-[#f8f7f2]">
              <div className="max-w-7xl mx-auto space-y-8 pb-10">
                 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-10 rounded-[2.5rem] border shadow-sm">
                    <div>
                      <h3 className="text-4xl font-black brand-font uppercase italic tracking-tighter mb-4">Resumen de Ventas</h3>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setQuickFilter('today')} className="px-5 py-2.5 bg-[#ff0095] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Hoy</button>
                        <button onClick={() => setQuickFilter('yesterday')} className="px-5 py-2.5 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase border">Ayer</button>
                        <button onClick={() => setQuickFilter('last7')} className="px-5 py-2.5 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase border">7 días</button>
                        <button onClick={() => setQuickFilter('month')} className="px-5 py-2.5 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase border">Mes Actual</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-2xl border">
                        <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-[10px] font-black outline-none border-none" />
                        <span className="text-gray-300 font-black px-1">→</span>
                        <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-[10px] font-black outline-none border-none" />
                      </div>
                      <button onClick={exportToExcel} className="bg-[#1d8a42] text-white px-8 py-5 rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 hover:scale-105 transition-all"><i className="fa-solid fa-file-excel"></i> EXCEL</button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <KPIReportCard title="VENTAS TOTALES" value={`S/ ${totalSales.toFixed(2)}`} icon="fa-sack-dollar" color="#ff0095" />
                    <KPIReportCard title="PEDIDOS TOTALES" value={orderCount.toString()} icon="fa-bowl-rice" color="#000" onClick={() => setShowOrderListModal(true)} />
                    <KPIReportCard title="TICKET PROMEDIO" value={`S/ ${orderCount > 0 ? (totalSales/orderCount).toFixed(2) : '0.00'}`} icon="fa-receipt" color="#2563eb" />
                 </div>

                 {/* Detalles de Reporte: Origen y Métodos */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 italic">Origen de Ventas</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-gray-50 rounded-2xl border flex flex-col items-center">
                             <i className="fa-solid fa-globe text-[#ff0095] mb-2"></i>
                             <p className="text-[9px] font-black uppercase text-gray-400">Web</p>
                             <h6 className="text-xl font-black italic brand-font">S/ {sources.web.total.toFixed(2)}</h6>
                             <span className="text-[8px] font-bold text-gray-300">{sources.web.count} pedidos</span>
                          </div>
                          <div className="p-6 bg-gray-50 rounded-2xl border flex flex-col items-center">
                             <i className="fa-solid fa-cash-register text-black mb-2"></i>
                             <p className="text-[9px] font-black uppercase text-gray-400">POS Local</p>
                             <h6 className="text-xl font-black italic brand-font">S/ {sources.pos.total.toFixed(2)}</h6>
                             <span className="text-[8px] font-bold text-gray-300">{sources.pos.count} pedidos</span>
                          </div>
                       </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 italic">Métodos de Pago</h4>
                       <div className="space-y-3">
                          {Object.entries(payments).map(([key, stats]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                               <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] uppercase font-black ${key === 'yape' ? 'bg-[#ff0095]' : key === 'plin' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                    {key[0]}
                                  </div>
                                  <span className="text-[10px] font-black uppercase">{key}</span>
                               </div>
                               <div className="text-right">
                                  <p className="text-[11px] font-black">S/ {stats.total.toFixed(2)}</p>
                                  <p className="text-[7px] font-bold text-gray-300 uppercase">{stats.count} ped.</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* Top Productos */}
                 <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8 italic">Top 10 Productos Más Vendidos</h4>
                    <div className="space-y-4">
                       {topProducts.map((p, i) => (
                         <div key={i} className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-gray-300 w-6">{(i+1).toString().padStart(2, '0')}</span>
                            <div className="flex-grow bg-gray-50 h-10 rounded-xl overflow-hidden flex items-center px-4 justify-between border">
                               <span className="text-[10px] font-black uppercase italic truncate max-w-[200px]">{p.name}</span>
                               <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-black text-[#ff0095]">{p.qty} un.</span>
                                  <span className="text-[10px] font-black text-black">S/ {p.total.toFixed(2)}</span>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'pos' && (
          <div className="flex h-full overflow-hidden bg-[#f8f7f2]">
             <div className="flex-grow flex flex-col p-8 overflow-hidden">
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 mb-4">
                  <button onClick={() => setPosCategory('todo')} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${posCategory === 'todo' ? 'bg-black text-white' : 'bg-white border'}`}>TODO</button>
                  {categories.map(c => <button key={c.id} onClick={() => setPosCategory(c.id)} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${posCategory === c.id ? 'bg-[#ff0095] text-white' : 'bg-white border'}`}>{c.name}</button>)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto no-scrollbar pb-10">
                   {products.filter(p => posCategory === 'todo' || p.category_id === posCategory).map(p => (
                     <button key={p.id} onClick={() => addToPOS(p)} className="bg-white p-4 rounded-[2rem] border shadow-sm hover:border-black transition-all text-left group">
                        <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-50"><img src={p.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
                        <h5 className="font-black text-[11px] uppercase italic truncate">{p.name}</h5><p className="text-[#ff0095] font-black text-[12px] italic">S/ {p.price.toFixed(2)}</p>
                     </button>
                   ))}
                </div>
             </div>
             <div className="w-[400px] bg-white border-l shadow-2xl flex flex-col p-8">
               <h4 className="text-2xl font-black brand-font uppercase italic mb-8">Carrito POS</h4>
               <div className="flex-grow overflow-y-auto no-scrollbar space-y-4">
                  {posCart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl">
                       <div className="flex-grow"><h6 className="font-black text-[11px] uppercase italic">{item.name}</h6><p className="text-[10px] font-bold text-gray-400">S/ {item.price.toFixed(2)}</p></div>
                       <div className="flex items-center gap-3">
                          <button onClick={() => setPosCart(posCart.map(i => i.id === item.id ? {...i, quantity: Math.max(0, i.quantity - 1)} : i).filter(i => i.quantity > 0))} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-black">-</button>
                          <span className="font-black text-xs">{item.quantity}</span>
                          <button onClick={() => addToPOS(item)} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-black">+</button>
                       </div>
                    </div>
                  ))}
               </div>
               <div className="pt-8 border-t space-y-4">
                  <div className="flex justify-between items-end"><span className="text-[10px] font-black text-gray-400">TOTAL A COBRAR</span><span className="text-4xl font-black italic brand-font">S/ {posTotal.toFixed(2)}</span></div>
                  <button disabled={posCart.length === 0} onClick={() => setShowCheckoutModal(true)} className="w-full bg-[#ff0095] text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-gray-200">COBRAR</button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
           <div className="p-8 h-full flex flex-col overflow-hidden animate-reveal">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-3xl font-black brand-font italic uppercase tracking-tighter">Gestión de Pedidos</h3>
                 <button onClick={fetchOrders} className={`w-12 h-12 bg-white rounded-2xl border shadow-sm ${loadingOrders ? 'animate-spin' : ''}`}><i className="fa-solid fa-rotate-right"></i></button>
              </div>
              <div className="flex gap-6 overflow-x-auto h-full pb-8 no-scrollbar items-start">
                <KanbanCol title="PENDIENTES" color="#f59e0b" count={orders.filter(o => o.status === 'pending').length}>
                  {orders.filter(o => o.status === 'pending').map(o => (
                    <OrderCard key={o.id} order={o} primaryAction={{ label: 'CONFIRMAR', color: 'bg-blue-600', onClick: () => updateOrderStatus(o.id, 'confirmed') }} onMarkPaid={() => updatePaymentStatus(o.id, 'paid')} onDelete={async () => { if(confirm('¿Eliminar?')) { await supabase.from('orders').delete().eq('id', o.id); fetchOrders(); } }} />
                  ))}
                </KanbanCol>
                <KanbanCol title="EN COCINA" color="#2563eb" count={orders.filter(o => ['confirmed', 'ready'].includes(o.status)).length}>
                  {orders.filter(o => ['confirmed', 'ready'].includes(o.status)).map(o => (
                    <OrderCard key={o.id} order={o} primaryAction={{ label: 'COMPLETAR', color: 'bg-green-600', onClick: () => updateOrderStatus(o.id, 'completed') }} onDelete={async () => { if(confirm('¿Eliminar?')) { await supabase.from('orders').delete().eq('id', o.id); fetchOrders(); } }} />
                  ))}
                </KanbanCol>
                <KanbanCol title="FINALIZADOS" color="#9ca3af" count={orders.filter(o => ['completed', 'cancelled'].includes(o.status)).length}>
                  {orders.filter(o => ['completed', 'cancelled'].includes(o.status)).map(o => (
                    <OrderCard key={o.id} order={o} onDelete={async () => { if(confirm('¿Eliminar?')) { await supabase.from('orders').delete().eq('id', o.id); fetchOrders(); } }} isArchived />
                  ))}
                </KanbanCol>
              </div>
           </div>
        )}

        {activeTab === 'products' && (
          <div className="p-8 h-full overflow-y-auto no-scrollbar animate-reveal">
            <div className="max-w-5xl mx-auto space-y-6 pb-20">
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex justify-between items-center">
                <h4 className="text-2xl font-black brand-font uppercase italic">Carta Digital</h4>
                <button onClick={() => setEditingProduct({ price: 0, description: '', name: '', image_url: '' })} className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-[#ff0095] transition-all">+ NUEVO PLATO</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all">
                    <div className="aspect-square rounded-[2rem] overflow-hidden bg-gray-50"><img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /></div>
                    <div className="px-2"><h5 className="font-black text-[11px] uppercase truncate italic">{p.name}</h5><p className="text-[#ff0095] font-black text-xs italic tracking-tighter">S/ {p.price.toFixed(2)}</p></div>
                    <button onClick={() => setEditingProduct(p)} className="w-full py-3 bg-gray-50 rounded-xl text-[9px] font-black uppercase hover:bg-black hover:text-white transition-all">EDITAR</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="p-8 h-full overflow-y-auto no-scrollbar animate-reveal">
             <div className="max-w-4xl mx-auto space-y-8 pb-20">
                <div className="bg-white p-10 rounded-[3rem] border shadow-sm flex flex-col items-center text-center gap-8">
                   <h4 className="text-xl font-black brand-font uppercase italic border-b pb-4 w-full">Identidad Visual</h4>
                   <div className="flex gap-12 items-center flex-wrap justify-center">
                      <div className="space-y-4">
                        <div className="w-40 h-40 bg-gray-50 rounded-[2.5rem] border-2 border-dashed flex items-center justify-center overflow-hidden">
                          {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain" /> : <i className="fa-solid fa-image text-gray-200 text-3xl"></i>}
                        </div>
                        <button onClick={() => logoInputRef.current?.click()} className="w-full py-3 bg-black text-white rounded-xl text-[9px] font-black uppercase hover:bg-[#ff0095] transition-all">Cambiar Logo</button>
                      </div>
                      <div className="space-y-4">
                        <div className="w-64 h-40 bg-gray-50 rounded-[2.5rem] border-2 border-dashed flex items-center justify-center overflow-hidden gap-2 px-4">
                          {config.slide_urls?.slice(0, 3).map((url, i) => <img key={i} src={url} className="w-12 h-20 object-cover rounded-lg" />)}
                          <span className="text-[9px] font-black text-gray-300">+{Math.max(0, (config.slide_urls?.length || 0) - 3)}</span>
                        </div>
                        <button onClick={() => slideInputRef.current?.click()} className="w-full py-3 bg-black text-white rounded-xl text-[9px] font-black uppercase hover:bg-[#ff0095] transition-all">Agregar Slide</button>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-8">
                   <h4 className="text-xl font-black brand-font uppercase italic border-b pb-4">Configuración de Pagos</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Field label="Número Yape" value={config.yape_number} onBlur={(v) => handleUpdateConfig({ yape_number: v })} />
                      <Field label="Titular Yape" value={config.yape_name} onBlur={(v) => handleUpdateConfig({ yape_name: v })} />
                      <Field label="Número Plin" value={config.plin_number} onBlur={(v) => handleUpdateConfig({ plin_number: v })} />
                      <Field label="Titular Plin" value={config.plin_name} onBlur={(v) => handleUpdateConfig({ plin_name: v })} />
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-8">
                   <h4 className="text-xl font-black brand-font uppercase italic border-b pb-4">Redes Sociales y Local</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Field label="WhatsApp" value={config.whatsapp_number} onBlur={(v) => handleUpdateConfig({ whatsapp_number: v })} />
                      <Field label="Dirección" value={config.address} onBlur={(v) => handleUpdateConfig({ address: v })} />
                      <Field label="Instagram" value={config.instagram_url} onBlur={(v) => handleUpdateConfig({ instagram_url: v })} />
                      <Field label="TikTok" value={config.tiktok_url} onBlur={(v) => handleUpdateConfig({ tiktok_url: v })} />
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Modales de Edición */}
      {editingProduct && (
        <div className="fixed inset-0 z-[700] bg-black/90 flex items-center justify-center p-6 backdrop-blur-xl animate-reveal">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-black brand-font uppercase italic text-center">Configurar Plato</h2>
            <div className="flex flex-col items-center gap-4">
               <div className="w-32 h-32 bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed flex items-center justify-center">
                  {editingProduct.image_url ? <img src={editingProduct.image_url} className="w-full h-full object-cover" /> : <i className="fa-solid fa-camera text-gray-200 text-2xl"></i>}
               </div>
               <button onClick={() => productImgInputRef.current?.click()} className="text-[9px] font-black uppercase text-[#ff0095] hover:underline">Cambiar Imagen</button>
            </div>
            <div className="space-y-4">
              <Field label="Nombre" value={editingProduct.name} onBlur={(v) => setEditingProduct({...editingProduct, name: v})} />
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase">Descripción</label><textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl font-black outline-none text-xs h-24 resize-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase">Precio S/</label><input type="number" value={editingProduct.price || 0} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-xl font-black outline-none text-xs" /></div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase">Categoría</label>
                  <select value={editingProduct.category_id || ''} onChange={e => setEditingProduct({...editingProduct, category_id: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl font-black outline-none text-xs uppercase">
                    <option value="">Seleccionar...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button disabled={saving} onClick={async () => {
                setSaving(true); const { variants, category, ...cleanData } = editingProduct as any;
                try { if(editingProduct.id) await supabase.from('products').update(cleanData).eq('id', editingProduct.id); else await supabase.from('products').insert([cleanData]); setEditingProduct(null); onRefresh(); } catch(e) { alert("Error"); } finally { setSaving(false); }
              }} className="flex-grow bg-[#ff0095] text-white py-5 rounded-2xl font-black uppercase">GUARDAR</button>
              <button onClick={() => setEditingProduct(null)} className="px-6 bg-gray-50 rounded-2xl font-black text-sm text-red-500">✕</button>
            </div>
          </div>
        </div>
      )}

      {/* POS Checkout Modal - Mejorado para tu captura */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] p-16 flex flex-col items-center gap-12 shadow-2xl animate-reveal">
            <div className="text-center">
               <p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-[0.3em]">TOTAL DE VENTA</p>
               <h2 className="text-8xl font-black brand-font italic tracking-tighter">S/ {posTotal.toFixed(2)}</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4 w-full">
              {(['efectivo', 'yape', 'plin'] as const).map(m => (
                <button 
                  key={m} 
                  onClick={() => setPosPaymentMethod(m)} 
                  className={`py-8 rounded-3xl text-xs font-black uppercase border-2 transition-all duration-300 ${posPaymentMethod === m ? 'bg-black text-white border-black scale-105 shadow-xl' : 'bg-gray-50/50 text-gray-400 border-transparent hover:border-gray-200'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button 
              disabled={saving} 
              onClick={handlePOSCheckout} 
              className="w-full bg-[#ff0095] text-white py-10 rounded-3xl font-black uppercase text-xl shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-4"
            >
              {saving ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-check"></i>}
              CONFIRMAR VENTA
            </button>
            
            <button onClick={() => setShowCheckoutModal(false)} className="text-xs font-black uppercase text-gray-300 hover:text-black transition-colors">CANCELAR</button>
          </div>
        </div>
      )}

      {/* Ticket Post-Venta */}
      {lastOrderForTicket && (
        <div className="fixed inset-0 z-[1100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl animate-reveal">
           <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl">
              <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto text-3xl shadow-xl"><i className="fa-solid fa-check"></i></div>
              <h2 className="text-2xl font-black uppercase italic brand-font">Venta Exitosa</h2>
              <div ref={ticketRef} className="hidden">
                 <div className="center">{config.logo_url && <img src={config.logo_url} />}<p className="bold">CHICHA CEVICHERIA</p><p>{config.address}</p></div>
                 <div className="border-b" style={{marginTop: '10px'}}><p>ORDEN: #{lastOrderForTicket.id.slice(-4).toUpperCase()}</p><p>PAGO: {lastOrderForTicket.payment_method.toUpperCase()}</p></div>
                 <div className="border-b">{lastOrderForTicket.items?.map((i: any, idx: number) => (<div key={idx} className="row"><span>{i.quantity}x {i.product_name}</span><span>{(i.price * i.quantity).toFixed(2)}</span></div>))}</div>
                 <div className="row bold" style={{fontSize: '14px', marginTop: '5px'}}><span>TOTAL</span><span>S/ {lastOrderForTicket.total_amount.toFixed(2)}</span></div>
              </div>
              <div className="space-y-4">
                <button onClick={handlePrintTicket} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3 shadow-xl"><i className="fa-solid fa-print"></i> TICKET</button>
                <button onClick={() => setLastOrderForTicket(null)} className="w-full text-gray-400 font-black uppercase text-[10px]">CONTINUAR</button>
              </div>
           </div>
        </div>
      )}

      {showOrderListModal && (
        <div className="fixed inset-0 z-[1200] bg-black/80 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] p-10 flex flex-col shadow-2xl animate-reveal">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black brand-font uppercase italic tracking-tighter">Historial de Ventas</h3>
              <button onClick={() => setShowOrderListModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-black hover:bg-red-50 transition-all"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="flex-grow overflow-y-auto no-scrollbar space-y-4">
              {reportOrders.map(o => (
                <div key={o.id} className="bg-gray-50/50 p-6 rounded-[2rem] border flex items-center gap-6">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase text-white ${ (o.customer_name === 'Venta Directa Local' || o.address === 'Venta Presencial') ? 'bg-black' : 'bg-[#ff0095]'}`}>{ (o.customer_name === 'Venta Directa Local' || o.address === 'Venta Presencial') ? 'POS' : 'WEB'}</div>
                   <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div><h6 className="font-black text-[11px] uppercase italic">{o.customer_name}</h6><p className="text-[9px] font-bold text-gray-400">{o.customer_phone || '-'}</p></div>
                      <div className="text-[9px] font-bold text-gray-500 truncate">{o.address}</div>
                      <div className="text-[9px] font-bold text-gray-400 truncate">{(o.order_items || o.items || []).map((i:any) => i.product_name).join(', ')}</div>
                      <div className="flex items-center justify-end gap-6"><p className="text-sm font-black italic">S/ {o.total_amount.toFixed(2)}</p></div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KPIReportCard: React.FC<{ title: string; value: string; icon: string; color: string; onClick?: () => void }> = ({ title, value, icon, color, onClick }) => (
  <div onClick={onClick} className={`bg-white p-10 rounded-[3rem] border shadow-sm flex items-center gap-8 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}>
    <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white text-2xl" style={{ backgroundColor: color }}><i className={`fa-solid ${icon}`}></i></div>
    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p><h5 className="text-4xl font-black italic brand-font">{value}</h5></div>
  </div>
);

const TabBtn: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void; collapsed: boolean }> = ({ active, icon, label, onClick, collapsed }) => (
  <button onClick={onClick} className={`flex items-center gap-4 p-4 rounded-[1.2rem] text-[10px] font-black uppercase transition-all ${active ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
    <i className={`fa-solid ${icon} ${active ? 'text-[#ff0095]' : ''} ${collapsed ? 'text-xl mx-auto' : 'text-sm'}`}></i> {!collapsed && <span>{label}</span>}
  </button>
);

const Field: React.FC<{ label: string; value?: string; onBlur: (v: string) => void }> = ({ label, value, onBlur }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black uppercase text-gray-400 ml-1 tracking-widest">{label}</label>
    <input type="text" defaultValue={value} onBlur={(e) => onBlur(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-black text-xs border-2 border-transparent focus:border-black transition-all" />
  </div>
);

const KanbanCol: React.FC<{ title: string; color: string; count: number; children: React.ReactNode }> = ({ title, color, count, children }) => (
  <div className="flex-1 min-w-[320px] flex flex-col bg-white rounded-[2.5rem] p-6 border-t-[8px] shadow-sm max-h-full overflow-hidden" style={{ borderTopColor: color }}>
    <div className="flex justify-between mb-6 px-2 items-center"><h4 className="text-[10px] font-black uppercase italic tracking-widest" style={{ color }}>{title}</h4><span className="bg-gray-50 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400">{count}</span></div>
    <div className="space-y-4 flex-grow overflow-y-auto no-scrollbar pb-6">{children}</div>
  </div>
);

const OrderCard: React.FC<{ order: Order; primaryAction?: { label: string; color: string; onClick: () => void }; onMarkPaid?: () => void; onDelete: () => void; isArchived?: boolean; }> = ({ order, primaryAction, onMarkPaid, onDelete, isArchived }) => (
  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative group hover:shadow-lg transition-all">
    <button onClick={onDelete} className="absolute top-4 right-4 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><i className="fa-solid fa-trash-can text-sm"></i></button>
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[8px] font-black text-[#ff0095] tracking-[0.3em]">#{order.id.slice(-4).toUpperCase()}</span>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase ${ (order.customer_name === 'Venta Directa Local' || order.address === 'Venta Presencial') ? 'bg-black text-white' : 'bg-[#ff0095] text-white'}`}>{(order.customer_name === 'Venta Directa Local' || order.address === 'Venta Presencial') ? 'POS' : 'WEB'}</span>
          <span className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400'}`}>{order.payment_method}</span>
        </div>
      </div>
      <h5 className="font-black text-[12px] uppercase italic truncate">{order.customer_name}</h5>
      {order.customer_phone && <p className="text-[9px] font-bold text-gray-400 mt-1">Cel: {order.customer_phone}</p>}
      {order.address && <p className="text-[9px] text-gray-400 mt-2 bg-gray-50 p-2 rounded-lg border italic"><i className="fa-solid fa-location-dot mr-1"></i> {order.address}</p>}
    </div>
    <div className="space-y-1 text-[9px] font-bold text-gray-400 bg-gray-50/80 p-3 rounded-xl mb-4">
      {(order.order_items || order.items || []).map((item: any, i: number) => <div key={i} className="flex justify-between border-b border-gray-100 last:border-0 pb-1 pt-1"><span>{item.quantity}x {item.product_name}</span><span>S/ {item.price.toFixed(2)}</span></div>)}
      <div className="border-t-2 border-dashed mt-2 pt-2 font-black text-black flex justify-between"><span>TOTAL</span><span className="text-[#ff0095]">S/ {order.total_amount.toFixed(2)}</span></div>
    </div>
    <div className="flex gap-2">
      {primaryAction && <button onClick={primaryAction.onClick} className={`flex-grow py-3 rounded-xl text-[8px] font-black text-white uppercase ${primaryAction.color} shadow-lg transition-all`}>{primaryAction.label}</button>}
      {onMarkPaid && order.payment_status !== 'paid' && <button onClick={onMarkPaid} className="flex-grow py-3 rounded-xl text-[8px] font-black text-white bg-green-500 shadow-lg">PAGADO</button>}
    </div>
  </div>
);
