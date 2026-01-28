
import React, { useState, useRef, useEffect } from 'react';
import { MenuItem, Category, AppConfig, Order } from '../types';
import { supabase } from '../lib/supabase';

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
  const [activeTab, setActiveTab] = useState<'branding' | 'products' | 'orders'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const slideInputRef = useRef<HTMLInputElement>(null);
  const productImgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'orders' && isLoggedIn) {
      fetchOrders();
      const channel = supabase.channel('orders_realtime_admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeTab, isLoggedIn]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoadingOrders(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchOrders();
  };

  const updatePaymentStatus = async (orderId: string, newPaymentStatus: Order['payment_status']) => {
    await supabase.from('orders').update({ payment_status: newPaymentStatus }).eq('id', orderId);
    fetchOrders();
  };

  const handleUpdateConfig = async (updates: Partial<AppConfig>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ 
          id: 1, 
          ...config,
          ...updates,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'slide' | 'product') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      if (type === 'logo') {
        await handleUpdateConfig({ logo_url: finalUrl });
      } else if (type === 'slide') {
        const currentSlides = Array.isArray(config.slide_urls) ? config.slide_urls : [];
        await handleUpdateConfig({ slide_urls: [...currentSlides, finalUrl] });
      } else if (type === 'product' && editingProduct) {
        setEditingProduct({ ...editingProduct, image_url: finalUrl });
      }
    } catch (error: any) {
      alert(`Error: ${error.message}. ¿El bucket 'images' es público?`);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddSlideByUrl = () => {
    const url = prompt('URL de la imagen:');
    if (url && url.startsWith('http')) {
      const currentSlides = Array.isArray(config.slide_urls) ? config.slide_urls : [];
      handleUpdateConfig({ slide_urls: [...currentSlides, url] });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_session', 'active');
    }
  };

  if (!isOpen) return null;

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
        <form onSubmit={handleLogin} className="bg-white w-full max-w-sm rounded-[2rem] p-10 text-center shadow-2xl space-y-6">
          <h2 className="font-black brand-font text-2xl uppercase italic tracking-tighter">Acceso Admin</h2>
          <input type="password" placeholder="PIN" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 p-5 rounded-2xl text-center font-black outline-none border-2 border-transparent focus:border-black" autoFocus />
          <button className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] bg-[#f8f7f2] flex flex-col md:flex-row overflow-hidden">
      <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" accept="image/*" />
      <input type="file" ref={slideInputRef} onChange={(e) => handleFileUpload(e, 'slide')} className="hidden" accept="image/*" />
      <input type="file" ref={productImgInputRef} onChange={(e) => handleFileUpload(e, 'product')} className="hidden" accept="image/*" />

      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-56'} bg-white border-r flex flex-col z-20 shadow-sm transition-all duration-300`}>
        <div className="p-8 text-center border-b">
          <h2 className={`text-2xl font-black brand-font italic leading-none ${isSidebarCollapsed ? 'hidden' : 'block'}`}>CHICHA</h2>
          <span className={`text-[7px] font-black uppercase tracking-[0.4em] text-[#ff0095] block mt-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>DASHBOARD</span>
        </div>
        
        <nav className="flex flex-col p-3 gap-2 flex-grow mt-4">
          <TabBtn active={activeTab === 'orders'} icon="fa-list-check" label="Pedidos" onClick={() => setActiveTab('orders')} collapsed={isSidebarCollapsed} />
          <TabBtn active={activeTab === 'products'} icon="fa-bowl-rice" label="Platos" onClick={() => setActiveTab('products')} collapsed={isSidebarCollapsed} />
          <TabBtn active={activeTab === 'branding'} icon="fa-sliders" label="Ajustes" onClick={() => setActiveTab('branding')} collapsed={isSidebarCollapsed} />
        </nav>

        <div className="p-4 border-t">
           <button onClick={onClose} className="w-full p-4 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#ff0095] transition-all">SALIR</button>
        </div>
      </div>

      <div className="flex-grow flex flex-col overflow-hidden relative">
        {saving && (
          <div className="absolute top-6 right-6 z-50 bg-black text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl animate-pulse">
            <i className="fa-solid fa-cloud-arrow-up"></i> Guardando...
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="h-full flex flex-col p-8 overflow-hidden animate-reveal">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black brand-font italic uppercase tracking-tighter">Panel de Pedidos</h3>
              <button onClick={fetchOrders} className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center border shadow-sm ${loadingOrders ? 'animate-spin' : ''}`}>
                <i className="fa-solid fa-rotate-right text-sm"></i>
              </button>
            </div>
            <div className="flex gap-8 overflow-x-auto h-full pb-8 no-scrollbar items-start">
              <KanbanCol title="PENDIENTES" color="#f59e0b" count={orders.filter(o => o.status === 'pending').length}>
                {orders.filter(o => o.status === 'pending').map(o => (
                  <OrderCard 
                    key={o.id} 
                    order={o} 
                    primaryAction={{ label: 'CONFIRMAR', color: 'bg-blue-600', onClick: () => updateOrderStatus(o.id, 'confirmed') }} 
                    onMarkPaid={() => updatePaymentStatus(o.id, 'paid')}
                    onDelete={async () => { if(confirm('¿Borrar?')) await supabase.from('orders').delete().eq('id', o.id); fetchOrders(); }} 
                  />
                ))}
              </KanbanCol>
              <KanbanCol title="EN COCINA" color="#2563eb" count={orders.filter(o => ['confirmed', 'ready'].includes(o.status)).length}>
                {orders.filter(o => ['confirmed', 'ready'].includes(o.status)).map(o => (
                  <OrderCard 
                    key={o.id} 
                    order={o} 
                    primaryAction={{ label: 'COMPLETAR', color: 'bg-green-600', onClick: () => updateOrderStatus(o.id, 'completed') }} 
                    onMarkPaid={() => updatePaymentStatus(o.id, 'paid')}
                    onDelete={async () => { if(confirm('¿Borrar?')) await supabase.from('orders').delete().eq('id', o.id); fetchOrders(); }} 
                  />
                ))}
              </KanbanCol>
              <KanbanCol title="HISTORIAL" color="#9ca3af" count={orders.filter(o => ['completed', 'cancelled'].includes(o.status)).length}>
                {orders.filter(o => ['completed', 'cancelled'].includes(o.status)).map(o => (
                  <OrderCard 
                    key={o.id} 
                    order={o} 
                    onDelete={async () => { if(confirm('¿Borrar?')) await supabase.from('orders').delete().eq('id', o.id); fetchOrders(); }} 
                    isArchived 
                  />
                ))}
              </KanbanCol>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
           <div className="p-8 h-full overflow-y-auto no-scrollbar animate-reveal">
              <div className="max-w-5xl mx-auto space-y-6">
                 <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex justify-between items-center">
                    <div>
                      <h4 className="text-xl font-black brand-font uppercase italic leading-none">Mi Carta</h4>
                    </div>
                    <button onClick={() => setEditingProduct({ price: 0, description: '' })} className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">+ NUEVO PLATO</button>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map(p => (
                       <div key={p.id} className="bg-white p-5 rounded-[2.5rem] border flex flex-col gap-4 group shadow-sm hover:shadow-xl transition-all duration-500">
                          <img 
                            src={p.image_url || 'https://via.placeholder.com/400x400?text=SIN+IMAGEN'} 
                            className="w-full aspect-square rounded-[2rem] object-cover border" 
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600&auto=format&fit=crop'; }}
                          />
                          <div className="flex justify-between items-start px-2">
                             <div className="flex-grow pr-4">
                                <h5 className="font-black text-xs uppercase leading-tight truncate">{p.name}</h5>
                                <p className="text-[#ff0095] font-black text-xs mt-1 italic tracking-tighter">S/ {p.price.toFixed(2)}</p>
                             </div>
                             <button onClick={() => setEditingProduct(p)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 hover:text-black transition-colors shrink-0">
                                <i className="fa-solid fa-pencil text-sm"></i>
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'branding' && (
           <div className="p-8 h-full overflow-y-auto no-scrollbar animate-reveal">
              <div className="max-w-4xl mx-auto space-y-10 pb-20">
                 <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-8">
                    <div className="border-b pb-6">
                      <h4 className="text-xl font-black brand-font uppercase italic tracking-tighter">Logo Principal</h4>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-12">
                       <div className="w-48 h-48 bg-[#fdf9c4]/30 rounded-[2.5rem] border-4 border-dashed border-[#fdf9c4] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain p-4" /> : <i className="fa-solid fa-image text-gray-200 text-5xl"></i>}
                       </div>
                       <div className="flex-grow space-y-6 w-full">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <button onClick={() => logoInputRef.current?.click()} className="bg-black text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl">
                                {isUploading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>} SUBIR ARCHIVO
                             </button>
                             <button onClick={() => {
                                const url = prompt('Enlace del logo:', config.logo_url);
                                if (url) handleUpdateConfig({ logo_url: url });
                             }} className="bg-gray-100 text-black py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest border border-transparent hover:border-black transition-all">
                                <i className="fa-solid fa-link"></i> USAR URL
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-8">
                    <div className="flex justify-between items-center border-b pb-6">
                       <h4 className="text-xl font-black brand-font uppercase italic tracking-tighter">Fotos de Bienvenida</h4>
                       <div className="flex gap-3">
                          <button onClick={() => slideInputRef.current?.click()} className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl">
                             {isUploading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-camera"></i>} AÑADIR
                          </button>
                          <button onClick={handleAddSlideByUrl} className="bg-gray-100 text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]">POR URL</button>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                       {(Array.isArray(config.slide_urls) ? config.slide_urls : []).map((url, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-[2rem] overflow-hidden border-2 border-gray-50 shadow-sm transition-all hover:shadow-xl">
                             <img src={url} className="w-full h-full object-cover" />
                             <button onClick={() => {
                                const newSlides = config.slide_urls.filter((_, i) => i !== idx);
                                handleUpdateConfig({ slide_urls: newSlides });
                             }} className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white">
                                <i className="fa-solid fa-trash-can text-lg"></i>
                             </button>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-10">
                    <div className="border-b pb-6">
                      <h4 className="text-xl font-black brand-font uppercase italic tracking-tighter">Información del Negocio</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <Field label="Nombre Comercial" value={config.yape_name} onBlur={(v) => handleUpdateConfig({ yape_name: v })} />
                       <Field label="WhatsApp / Yape" value={config.yape_number} onBlur={(v) => handleUpdateConfig({ yape_number: v, whatsapp_number: v })} />
                       <Field label="Ubicación" value={config.address} onBlur={(v) => handleUpdateConfig({ address: v })} />
                       <Field label="TikTok URL" value={config.tiktok_url} onBlur={(v) => handleUpdateConfig({ tiktok_url: v })} />
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-[700] bg-black/90 flex items-center justify-center p-6 backdrop-blur-xl animate-reveal">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] no-scrollbar">
            <h2 className="text-3xl font-black brand-font italic uppercase text-center tracking-tighter">Configurar Plato</h2>
            
            <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Nombre del Plato</label>
                 <input type="text" placeholder="Nombre" value={editingProduct.name || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-black transition-all text-sm uppercase" />
               </div>

               <div className="space-y-1">
                 <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Descripción / Ingredientes</label>
                 <textarea 
                   placeholder="Cuéntale al cliente qué trae este plato..." 
                   value={editingProduct.description || ''} 
                   onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} 
                   className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-black transition-all text-sm h-32 resize-none"
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Precio S/</label>
                    <input type="number" placeholder="Precio S/" value={editingProduct.price || 0} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-black transition-all text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Categoría</label>
                    <select value={editingProduct.category_id || ''} onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-sm appearance-none border-2 border-transparent focus:border-black">
                      <option value="">ELEGIR...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                    </select>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Imagen</label>
                  <button onClick={() => productImgInputRef.current?.click()} className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                     {isUploading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-camera"></i>} {editingProduct.image_url ? 'CAMBIAR FOTO' : 'SUBIR FOTO'}
                  </button>
                  <input type="text" placeholder="O pega URL de imagen..." value={editingProduct.image_url || ''} onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-[10px] border border-gray-100 italic" />
               </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                disabled={saving || !editingProduct.name}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const data = { ...editingProduct };
                    // Eliminar campos que no van a la base de datos
                    delete (data as any).variants;
                    delete (data as any).category;
                    
                    if (editingProduct.id) {
                      await supabase.from('products').update(data).eq('id', editingProduct.id);
                    } else {
                      await supabase.from('products').insert([data]);
                    }
                    setEditingProduct(null);
                    onRefresh();
                  } catch (err: any) {
                    alert(`Error: ${err.message}`);
                  } finally {
                    setSaving(false);
                  }
                }} 
                className="flex-grow py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all bg-[#ff0095] text-white hover:bg-black disabled:bg-gray-200"
              >
                {saving ? 'GUARDANDO...' : 'CONFIRMAR'}
              </button>
              <button onClick={() => setEditingProduct(null)} className="px-8 bg-gray-100 rounded-[1.5rem] font-black uppercase text-[10px]">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void; collapsed: boolean }> = ({ active, icon, label, onClick, collapsed }) => (
  <button onClick={onClick} className={`flex items-center gap-4 p-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${active ? 'bg-black text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-gray-50'}`}>
    <i className={`fa-solid ${icon} ${active ? 'text-[#ff0095]' : ''} ${collapsed ? 'text-xl mx-auto' : 'text-sm'}`}></i> 
    {!collapsed && <span>{label}</span>}
  </button>
);

const Field: React.FC<{ label: string; value?: string; onBlur: (v: string) => void }> = ({ label, value, onBlur }) => (
  <div className="space-y-2">
    <label className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">{label}</label>
    <input type="text" defaultValue={value} onBlur={(e) => onBlur(e.target.value)} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-black text-xs border-2 border-transparent focus:border-black transition-all" />
  </div>
);

const KanbanCol: React.FC<{ title: string; color: string; count: number; children: React.ReactNode }> = ({ title, color, count, children }) => (
  <div className="flex-1 min-w-[320px] flex flex-col bg-white rounded-[3rem] p-8 border-t-[12px] shadow-sm h-full" style={{ borderTopColor: color }}>
    <div className="flex items-center justify-between mb-8 px-2">
      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] italic" style={{ color }}>{title}</h4>
      <span className="bg-gray-50 text-gray-400 px-4 py-2 rounded-2xl text-[11px] font-black shadow-inner">{count}</span>
    </div>
    <div className="flex-grow space-y-5 overflow-y-auto no-scrollbar pb-10">
      {children}
    </div>
  </div>
);

const OrderCard: React.FC<{ order: Order; primaryAction?: { label: string; color: string; onClick: () => void }; onMarkPaid?: () => void; onDelete: () => void; isArchived?: boolean; }> = ({ order, primaryAction, onMarkPaid, onDelete, isArchived }) => (
  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 relative group hover:shadow-xl transition-all duration-500 overflow-hidden">
    
    {/* Sello de Pagado */}
    {order.payment_status === 'paid' && (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 opacity-15 pointer-events-none z-0">
        <div className="border-8 border-green-600 px-12 py-6 rounded-3xl flex flex-col items-center">
           <span className="text-green-600 text-6xl font-black brand-font uppercase italic leading-none">PAGADO</span>
           <span className="text-green-600 text-xl font-black uppercase tracking-[0.5em] mt-2">CHICHA PIURA</span>
        </div>
      </div>
    )}

    <button onClick={onDelete} className="absolute top-4 right-4 text-gray-100 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10">
      <i className="fa-solid fa-trash-can text-sm"></i>
    </button>
    
    <div className="mb-4 relative z-10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[8px] font-black uppercase text-[#ff0095] tracking-widest bg-[#ff0095]/5 px-3 py-1 rounded-full">#{order.id.slice(-4)}</span>
        <div className="flex gap-2">
          {order.order_type === 'delivery' ? (
            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[8px] font-black uppercase"><i className="fa-solid fa-motorcycle mr-1"></i> DELIVERY</span>
          ) : (
            <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-[8px] font-black uppercase"><i className="fa-solid fa-house-user mr-1"></i> RECOJO</span>
          )}
          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
            {order.payment_method} {order.payment_status === 'paid' ? '✓' : ''}
          </span>
        </div>
      </div>
      <h5 className="font-black text-sm uppercase italic leading-tight truncate pr-8">{order.customer_name}</h5>
      {order.order_type === 'delivery' && (
        <p className="text-[10px] text-gray-400 font-bold italic mt-1 leading-tight"><i className="fa-solid fa-location-dot mr-1"></i> {order.address}</p>
      )}
    </div>

    <div className="space-y-1 mb-6 text-[10px] font-bold text-gray-500 italic bg-gray-50/50 p-3 rounded-xl relative z-10">
      {order.items?.map((item, i) => (
        <div key={i} className="flex justify-between border-b border-gray-100/50 last:border-0 pb-1 pt-1">
          <span className="text-black/80">{item.quantity}x {item.product_name}</span>
          <span className="text-gray-300">S/ {item.price.toFixed(2)}</span>
        </div>
      ))}
      <div className="flex justify-between pt-2 mt-1 border-t-2 border-dashed border-gray-200">
        <span className="text-black font-black uppercase text-[9px]">TOTAL</span>
        <span className="text-[#ff0095] font-black">S/ {order.total_amount.toFixed(2)}</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 relative z-10">
      {primaryAction && (
        <button onClick={primaryAction.onClick} className={`py-4 rounded-[1.2rem] text-[9px] font-black text-white uppercase tracking-widest ${primaryAction.color} active:scale-95 transition-all shadow-lg`}>
          {primaryAction.label}
        </button>
      )}
      {onMarkPaid && order.payment_status !== 'paid' && (
        <button onClick={onMarkPaid} className="py-4 rounded-[1.2rem] text-[9px] font-black text-white uppercase tracking-widest bg-green-500 active:scale-95 transition-all shadow-lg">
          PAGADO
        </button>
      )}
      {order.payment_status === 'paid' && !isArchived && (
         <div className="col-span-full py-4 text-center border-2 border-dashed border-green-200 rounded-2xl flex items-center justify-center gap-2 text-green-600 text-[10px] font-black uppercase tracking-widest">
            <i className="fa-solid fa-circle-check"></i> PAGO REGISTRADO
         </div>
      )}
    </div>
    {isArchived && <div className="text-center text-[9px] font-black text-gray-200 uppercase tracking-[0.4em] italic mt-2">Finalizado</div>}
  </div>
);
