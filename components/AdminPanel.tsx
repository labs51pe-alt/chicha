
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
      const channel = supabase.channel('orders_v8_tablet')
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

  const deleteOrder = async (orderId: string) => {
    if (confirm('¿Borrar pedido permanentemente?')) {
      await supabase.from('orders').delete().eq('id', orderId);
      fetchOrders();
    }
  };

  const handleUpdateConfig = async (updates: Partial<AppConfig>) => {
    try {
      const { error } = await supabase.from('app_config').update(updates).eq('id', config.id);
      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error updating config:', error);
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

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('CONFIGURACIÓN REQUERIDA: Debes crear un "Bucket" llamado "images" en el Storage de tu panel de Supabase y ponerlo como Público para poder subir archivos.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (type === 'logo') {
        handleUpdateConfig({ logo_url: publicUrl });
      } else if (type === 'slide') {
        const newSlides = [...(config.slide_urls || []), publicUrl];
        handleUpdateConfig({ slide_urls: newSlides });
      } else if (type === 'product' && editingProduct) {
        setEditingProduct({ ...editingProduct, image_url: publicUrl });
      }
    } catch (error: any) {
      console.error('Error uploading:', error);
      alert(error.message || 'Error al subir imagen. ¿Tienes configurado el Storage en Supabase?');
    } finally {
      setIsUploading(false);
      // Reset input value to allow uploading same file again
      e.target.value = '';
    }
  };

  const handleFinalizeAndNotify = (order: Order) => {
    const isDelivery = order.order_type === 'delivery';
    const message = isDelivery 
      ? `¡Habla churre! Tu pedido de Chicha ya va en camino. 🛵 Atento.` 
      : `¡Habla churre! Tu pedido ya está listo. ✅ Puedes pasar al Puesto 651.`;
    
    window.open(`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    updateOrderStatus(order.id, 'completed');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_session', 'active');
    }
  };

  const removeSlideUrl = (index: number) => {
    const newSlides = (config.slide_urls || []).filter((_, i) => i !== index);
    handleUpdateConfig({ slide_urls: newSlides });
  };

  if (!isOpen) return null;

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
        <form onSubmit={handleLogin} className="bg-white w-full max-w-sm rounded-[2rem] p-10 text-center shadow-2xl space-y-6">
          <h2 className="font-black brand-font text-2xl uppercase italic">Control Admin</h2>
          <input type="password" placeholder="PIN" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 p-5 rounded-2xl text-center font-black outline-none border-2 border-transparent focus:border-black" autoFocus />
          <button className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Entrar</button>
          <button type="button" onClick={onClose} className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Cerrar</button>
        </form>
      </div>
    );
  }

  const colPending = orders.filter(o => o.status === 'pending');
  const colCooking = orders.filter(o => o.status === 'confirmed' || o.status === 'ready');
  const colDone = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  return (
    <div className="fixed inset-0 z-[600] bg-[#f8f7f2] flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Colapsable */}
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-52'} bg-white border-r flex flex-col z-20 shadow-sm transition-all duration-300 relative`}>
        <div className="p-6 text-center border-b overflow-hidden whitespace-nowrap">
          <h2 className={`text-xl font-black brand-font italic leading-none transition-opacity ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>CHICHA</h2>
          <span className={`text-[7px] font-black uppercase tracking-widest text-[#ff0095] transition-opacity ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>PRO PANEL</span>
        </div>
        
        <nav className="flex flex-col p-2 gap-1 flex-grow">
          <TabBtn active={activeTab === 'orders'} icon="fa-list-check" label="Pedidos" onClick={() => setActiveTab('orders')} collapsed={isSidebarCollapsed} />
          <TabBtn active={activeTab === 'products'} icon="fa-bowl-rice" label="Platos" onClick={() => setActiveTab('products')} collapsed={isSidebarCollapsed} />
          <TabBtn active={activeTab === 'branding'} icon="fa-sliders" label="Ajustes" onClick={() => setActiveTab('branding')} collapsed={isSidebarCollapsed} />
        </nav>

        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-4 border-t text-gray-300 hover:text-black transition-colors">
          <i className={`fa-solid ${isSidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`}></i>
        </button>

        <button onClick={onClose} className="p-4 m-2 rounded-lg bg-gray-50 text-[9px] font-black uppercase text-gray-400 hover:bg-black hover:text-white transition-all whitespace-nowrap overflow-hidden">
          {isSidebarCollapsed ? <i className="fa-solid fa-power-off"></i> : 'SALIR'}
        </button>
      </div>

      <div className="flex-grow flex flex-col overflow-hidden">
        {activeTab === 'orders' && (
          <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black brand-font italic uppercase italic">PANEL EN VIVO</h3>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">CLOUD ACTIVE</span>
                 </div>
                 <button onClick={fetchOrders} className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center border shadow-sm hover:shadow-md transition-all ${loadingOrders ? 'animate-spin' : ''}`}>
                    <i className="fa-solid fa-rotate-right text-[12px] text-gray-400"></i>
                 </button>
              </div>
            </div>

            <div className="flex gap-4 md:gap-6 overflow-x-auto h-full pb-4 no-scrollbar items-start">
              <KanbanCol title="NUEVOS" color="#f59e0b" count={colPending.length}>
                {colPending.map(o => (
                  <OrderCard key={o.id} order={o} primaryAction={{ label: 'CONFIRMAR PAGO', color: 'bg-blue-600', onClick: () => updateOrderStatus(o.id, 'confirmed') }} onDelete={() => deleteOrder(o.id)} />
                ))}
              </KanbanCol>

              <KanbanCol title="EN COCINA / PROCESO" color="#2563eb" count={colCooking.length}>
                {colCooking.map(o => (
                  <OrderCard key={o.id} order={o} primaryAction={{ label: 'NOTIFICAR Y FINALIZAR', color: 'bg-green-600', onClick: () => handleFinalizeAndNotify(o) }} onDelete={() => deleteOrder(o.id)} />
                ))}
              </KanbanCol>

              <KanbanCol title="FINALIZADOS" color="#9ca3af" count={colDone.length}>
                {colDone.map(o => (
                  <OrderCard key={o.id} order={o} onDelete={() => deleteOrder(o.id)} isArchived />
                ))}
              </KanbanCol>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
           <div className="p-8 h-full overflow-y-auto no-scrollbar">
              <div className="max-w-4xl mx-auto space-y-4">
                 <div className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center">
                    <h4 className="text-sm font-black brand-font uppercase italic">Gestión de Carta</h4>
                    <button onClick={() => setEditingProduct({ price: 0 })} className="bg-black text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">+ Añadir Plato</button>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map(p => (
                       <div key={p.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between group shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-4">
                             <img src={p.image_url} className="w-12 h-12 rounded-xl object-cover border" />
                             <div>
                                <h5 className="font-black text-[11px] uppercase leading-none truncate w-24">{p.name}</h5>
                                <p className="text-[#ff0095] font-black text-[10px] mt-1 italic">S/ {p.price.toFixed(2)}</p>
                             </div>
                          </div>
                          <button onClick={() => setEditingProduct(p)} className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 hover:text-black hover:bg-white border border-transparent hover:border-gray-100 transition-all">
                             <i className="fa-solid fa-pencil text-[10px]"></i>
                          </button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'branding' && (
           <div className="p-8 h-full overflow-y-auto no-scrollbar">
              <div className="max-w-3xl mx-auto space-y-8 animate-reveal">
                 
                 {/* Alerta de Configuración Storage */}
                 <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-start gap-4">
                    <i className="fa-solid fa-circle-info text-blue-500 text-xl mt-1"></i>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900 mb-1">Estado del Almacenamiento</h4>
                      <p className="text-[11px] text-blue-800 leading-relaxed font-medium">Si la subida de archivos falla, asegúrate de crear el bucket <code className="bg-blue-100 px-1 rounded">images</code> en Supabase Storage y marcarlo como <strong>Público</strong>.</p>
                    </div>
                 </div>

                 {/* Logo Upload Section */}
                 <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                    <h4 className="text-sm font-black brand-font uppercase italic border-b pb-4">Logo de la Marca</h4>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                       <div className="w-32 h-32 bg-gray-50 rounded-2xl border flex items-center justify-center overflow-hidden shrink-0">
                          {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain" /> : <i className="fa-solid fa-image text-gray-200 text-3xl"></i>}
                       </div>
                       <div className="flex-grow space-y-4 w-full">
                          <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" accept="image/*" />
                          <div className="flex flex-col gap-2">
                             <button onClick={() => logoInputRef.current?.click()} className="flex-grow bg-black text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#ff0095] transition-all">
                                {isUploading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>} SUBIR ARCHIVO
                             </button>
                             <div className="flex items-center gap-2">
                               <input 
                                 type="text" 
                                 placeholder="O pega una URL directa aquí..." 
                                 defaultValue={config.logo_url} 
                                 onBlur={(e) => handleUpdateConfig({ logo_url: e.target.value })} 
                                 className="flex-grow p-4 bg-gray-50 rounded-xl text-[10px] font-bold border-2 border-transparent focus:border-gray-200 outline-none" 
                               />
                               <span className="text-[8px] font-black text-gray-300 uppercase">URL</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Ajustes del Carrusel */}
                 <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b pb-4">
                       <h4 className="text-sm font-black brand-font uppercase italic">Carrusel de Bienvenida</h4>
                       <div className="flex gap-2">
                          <input type="file" ref={slideInputRef} onChange={(e) => handleFileUpload(e, 'slide')} className="hidden" accept="image/*" />
                          <button onClick={() => slideInputRef.current?.click()} className="bg-black text-white px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                             {isUploading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-upload"></i>} SUBIR ARCHIVO
                          </button>
                          <button onClick={() => {
                             const url = prompt('URL de la imagen externa:');
                             if (url) {
                                const newSlides = [...(config.slide_urls || []), url];
                                handleUpdateConfig({ slide_urls: newSlides });
                             }
                          }} className="bg-gray-100 text-black px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest">AÑADIR POR URL</button>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                       {(config.slide_urls || []).map((url, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border bg-gray-50">
                             <img src={url} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => removeSlideUrl(idx)} className="text-white text-[12px] w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg"><i className="fa-solid fa-trash"></i></button>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Identidad & Pagos */}
                 <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-8">
                    <h4 className="text-sm font-black brand-font uppercase italic border-b pb-4">Identidad & Pagos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <Field label="Nombre Yape" value={config.yape_name} onBlur={(v) => handleUpdateConfig({ yape_name: v })} />
                          <Field label="Número Yape" value={config.yape_number} onBlur={(v) => handleUpdateConfig({ yape_number: v })} />
                       </div>
                       <div className="space-y-4">
                          <Field label="Número Plin" value={config.plin_number} onBlur={(v) => handleUpdateConfig({ plin_number: v })} />
                          <Field label="WhatsApp Soporte" value={config.whatsapp_number} onBlur={(v) => handleUpdateConfig({ whatsapp_number: v })} />
                       </div>
                    </div>
                    <Field label="Dirección Local" value={config.address} onBlur={(v) => handleUpdateConfig({ address: v })} />
                 </div>
              </div>
           </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-[700] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-5 animate-reveal">
            <h2 className="text-xl font-black brand-font italic uppercase text-center">Editar Plato</h2>
            <div className="space-y-4">
               <input type="text" placeholder="Nombre del plato" value={editingProduct.name || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none text-sm" />
               <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Precio S/" value={editingProduct.price || 0} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none text-sm" />
                  <select value={editingProduct.category_id || ''} onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })} className="p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none text-sm appearance-none">
                    <option value="">Categoría...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <textarea placeholder="Descripción del sabor..." value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none h-24 resize-none text-sm" />
               
               <div className="space-y-2">
                  <label className="text-[7px] font-black uppercase tracking-widest text-gray-300 ml-1">Imagen del Plato</label>
                  <div className="flex flex-col gap-2">
                     <input type="file" ref={productImgInputRef} onChange={(e) => handleFileUpload(e, 'product')} className="hidden" accept="image/*" />
                     <button onClick={() => productImgInputRef.current?.click()} className="flex-grow bg-black text-white py-3 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                        {isUploading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-camera"></i>} SUBIR DESDE GALERÍA
                     </button>
                     <div className="relative">
                        <input 
                          type="text" 
                          placeholder="O pega la URL de la imagen aquí..." 
                          value={editingProduct.image_url || ''} 
                          onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })} 
                          className="w-full p-4 bg-gray-50 rounded-xl font-bold border-2 border-transparent focus:border-gray-200 outline-none text-[10px]" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-200">URL</span>
                     </div>
                  </div>
               </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={async () => {
                if (!editingProduct.name) return;
                setSaving(true);
                const data = { ...editingProduct };
                delete (data as any).variants;
                if (editingProduct.id) await supabase.from('products').update(data).eq('id', editingProduct.id);
                else await supabase.from('products').insert([data]);
                setEditingProduct(null);
                onRefresh();
                setSaving(false);
              }} className="flex-grow bg-[#ff0095] text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                {saving ? '...' : 'GUARDAR CAMBIOS'}
              </button>
              <button onClick={() => setEditingProduct(null)} className="px-6 bg-gray-100 rounded-2xl font-black uppercase text-[10px]">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void; collapsed: boolean }> = ({ active, icon, label, onClick, collapsed }) => (
  <button onClick={onClick} className={`flex items-center gap-4 p-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${active ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
    <i className={`fa-solid ${icon} ${active ? 'text-[#ff0095]' : ''} ${collapsed ? 'text-lg mx-auto' : 'text-sm'}`}></i> 
    {!collapsed && <span>{label}</span>}
  </button>
);

const Field: React.FC<{ label: string; value?: string; onBlur: (v: string) => void }> = ({ label, value, onBlur }) => (
  <div className="space-y-1">
    <label className="text-[7px] font-black uppercase tracking-widest text-gray-300 ml-1">{label}</label>
    <input type="text" defaultValue={value} onBlur={(e) => onBlur(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl border-none outline-none font-bold text-xs focus:bg-white transition-colors" />
  </div>
);

const KanbanCol: React.FC<{ title: string; color: string; count: number; children: React.ReactNode }> = ({ title, color, count, children }) => (
  <div className="flex-1 min-w-[280px] md:min-w-[300px] max-w-[400px] flex flex-col bg-white rounded-[2rem] p-5 border-t-8 border-gray-100 shadow-sm relative overflow-hidden h-full" style={{ borderTopColor: color }}>
    <div className="flex items-center justify-between mb-5 px-1">
      <h4 className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color }}>{title}</h4>
      <span className="bg-gray-50 text-gray-400 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black">{count}</span>
    </div>
    <div className="flex-grow space-y-4 overflow-y-auto no-scrollbar pb-8">
      {children}
    </div>
  </div>
);

const OrderCard: React.FC<{ order: Order; primaryAction?: { label: string; color: string; onClick: () => void }; onDelete: () => void; isArchived?: boolean; }> = ({ order, primaryAction, onDelete, isArchived }) => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 hover:border-gray-200 transition-all relative animate-reveal">
      <button onClick={onDelete} className="absolute top-4 right-4 w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 z-10">
        <i className="fa-solid fa-trash text-[12px]"></i>
      </button>

      <div className="flex justify-between items-start mb-4 pr-10">
        <div className="flex flex-col gap-1">
          <span className={`text-[7px] font-black px-2 py-1 rounded-md uppercase inline-block ${order.order_type === 'delivery' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{order.order_type === 'delivery' ? '🛵 DELIVERY' : '🏠 RECOJO'}</span>
          <span className="text-[7px] font-bold text-gray-200 ml-1">#{order.id.slice(-4)}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-black italic leading-none">S/ {order.total_amount.toFixed(2)}</span>
          <div className="text-[7px] font-black uppercase text-[#ff0095] mt-1 tracking-wider">{order.payment_method}</div>
        </div>
      </div>

      <h5 className="font-black text-sm uppercase leading-tight mb-4 italic tracking-tight truncate pr-2">{order.customer_name}</h5>
      
      <div className="space-y-1.5 mb-4 text-[9px] font-bold text-gray-500 uppercase border-y py-3 border-gray-50/50">
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between items-center">
            <span>{item.quantity}x {item.product_name}</span>
            <span className="text-black/10 text-[8px]">S/ {item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {primaryAction && (
          <button onClick={primaryAction.onClick} className={`flex-grow py-3.5 rounded-xl text-[8px] font-black text-white uppercase tracking-widest ${primaryAction.color} active:scale-95 transition-all shadow-md hover:brightness-110`}>
            {primaryAction.label}
          </button>
        )}
        {isArchived && (
           <div className="flex-grow py-3.5 rounded-xl text-[8px] font-black text-gray-300 uppercase bg-gray-50 text-center flex items-center justify-center gap-2">
             <i className="fa-solid fa-check-double text-green-500/30"></i> FINALIZADO
           </div>
        )}
      </div>
    </div>
  );
};
