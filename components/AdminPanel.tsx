
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
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('admin_session') === 'active';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'branding' | 'products' | 'orders'>('orders'); // Por defecto en pedidos
  const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'orders' && isLoggedIn) {
      fetchOrders();
    }
  }, [activeTab, isLoggedIn]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      
      if (data) setOrders(data);
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    
    if (!error) fetchOrders();
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('¿Seguro que quieres borrar este registro de pedido?')) return;
    await supabase.from('orders').delete().eq('id', orderId);
    fetchOrders();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_session', 'active');
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('admin_session');
    onClose();
  };

  const handleUpdateConfig = async (updates: Partial<AppConfig>) => {
    setSaving(true);
    const { error } = await supabase.from('app_config').update(updates).eq('id', config.id);
    if (!error) onRefresh();
    setSaving(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'product') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (type === 'logo') {
          await handleUpdateConfig({ logo_url: base64 });
        } else if (type === 'product' && editingProduct) {
          setEditingProduct({ ...editingProduct, image_url: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProduct = async () => {
    if (!editingProduct?.name) return;
    setSaving(true);
    
    const productData = {
      name: editingProduct.name,
      description: editingProduct.description,
      price: editingProduct.price,
      image_url: editingProduct.image_url,
      category_id: editingProduct.category_id,
      is_popular: editingProduct.is_popular,
      is_combo: editingProduct.is_combo
    };

    if (editingProduct.id) {
      await supabase.from('products').update(productData).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert([productData]);
    }

    setEditingProduct(null);
    onRefresh();
    setSaving(false);
  };

  if (!isOpen) return null;

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 text-center shadow-2xl">
          <div className="mb-10">
            <div className="w-24 h-24 bg-[#ff0095]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-lock text-[#ff0095] text-4xl"></i>
            </div>
            <h2 className="font-black brand-font text-3xl uppercase tracking-tight">Admin</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 p-6 rounded-2xl text-center font-black outline-none border-2 border-transparent focus:border-[#ff0095]/20" autoFocus />
            <button className="w-full bg-black text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-[#ff0095] transition-all">Acceder</button>
            <button type="button" onClick={onClose} className="text-[11px] font-black uppercase text-gray-300 pt-4 block mx-auto">Cerrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10">
      <div className="bg-[#fffdf0] w-full max-w-7xl h-full rounded-[4rem] overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <div className="w-full md:w-72 bg-white p-10 flex flex-col gap-4 border-r">
          <h2 className="text-xl font-black brand-font mb-8">CHICHA <span className="text-[#ff0095]">GESTIÓN</span></h2>
          <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-4 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'orders' ? 'bg-[#ff0095] text-white' : 'text-gray-400'}`}>
            <i className="fa-solid fa-receipt text-lg"></i> Pedidos
          </button>
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-4 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'products' ? 'bg-[#ff0095] text-white' : 'text-gray-400'}`}>
            <i className="fa-solid fa-utensils text-lg"></i> Menú
          </button>
          <button onClick={() => setActiveTab('branding')} className={`flex items-center gap-4 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'branding' ? 'bg-[#ff0095] text-white' : 'text-gray-400'}`}>
            <i className="fa-solid fa-gem text-lg"></i> Identidad
          </button>
          <button onClick={handleLogout} className="mt-auto p-5 rounded-2xl bg-black text-white text-[10px] font-black uppercase">Salir</button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-12 no-scrollbar">
          
          {activeTab === 'orders' && (
            <div className="space-y-8 max-w-6xl mx-auto animate-reveal">
              <div className="flex justify-between items-center bg-white p-8 rounded-3xl border shadow-sm">
                <div>
                  <h3 className="text-2xl font-black brand-font italic uppercase leading-none">Pedidos Recibidos</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Gestión en tiempo real</p>
                </div>
                <button onClick={fetchOrders} className="w-12 h-12 bg-gray-50 rounded-2xl text-gray-400 hover:text-[#ff0095] transition-all flex items-center justify-center">
                  <i className={`fa-solid fa-arrows-rotate ${loadingOrders ? 'animate-spin' : ''}`}></i>
                </button>
              </div>
              
              {loadingOrders && orders.length === 0 ? (
                <div className="py-20 text-center"><i className="fa-solid fa-circle-notch animate-spin text-4xl text-[#ff0095]"></i></div>
              ) : orders.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                  <i className="fa-solid fa-inbox text-5xl text-gray-100 mb-4"></i>
                  <p className="font-black text-gray-300 uppercase tracking-widest text-xs">No hay pedidos registrados todavía</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-[3rem] border overflow-hidden shadow-sm hover:shadow-md transition-all">
                      {/* Cabecera del Pedido */}
                      <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b bg-gray-50/30">
                        <div className="flex gap-6 items-start">
                           <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-inner ${
                              order.order_type === 'delivery' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'
                           }`}>
                              <i className={order.order_type === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-house-user'}></i>
                           </div>
                           <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">#{order.id.slice(-6)}</span>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  order.order_type === 'delivery' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                                }`}>
                                  {order.order_type === 'delivery' ? 'DELIVERY' : 'RECOJO'}
                                </span>
                              </div>
                              <h4 className="text-xl font-black text-black uppercase leading-none">{order.customer_name}</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                {new Date(order.created_at).toLocaleString('es-PE')}
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase text-gray-300 block mb-1">Total a cobrar</span>
                            <span className="text-3xl font-black text-black italic leading-none">S/ {order.total_amount.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex gap-2">
                             <div className={`px-4 py-4 rounded-2xl text-[9px] font-black uppercase flex items-center border ${
                                order.status === 'completed' ? 'bg-green-50 border-green-100 text-green-500' : 
                                order.status === 'cancelled' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-orange-50 border-orange-100 text-orange-500'
                              }`}>
                                {order.status === 'pending' ? 'PENDIENTE' : order.status === 'completed' ? 'LISTO' : 'CANCELADO'}
                             </div>
                             
                             {order.status === 'pending' && (
                               <button onClick={() => updateOrderStatus(order.id, 'completed')} className="w-12 h-12 bg-green-500 text-white rounded-2xl shadow-lg shadow-green-200 hover:scale-110 active:scale-95 transition-all">
                                 <i className="fa-solid fa-check"></i>
                               </button>
                             )}
                             
                             <button onClick={() => deleteOrder(order.id)} className="w-12 h-12 bg-gray-50 text-gray-300 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                               <i className="fa-solid fa-trash-can text-xs"></i>
                             </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Detalles del Pedido */}
                      <div className="p-10 bg-white grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-[#ff0095] border-b border-[#ff0095]/10 pb-2">Platos seleccionados</h5>
                          <ul className="space-y-4">
                            {order.items?.map((item, idx) => (
                              <li key={idx} className="flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                   <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-black text-xs text-black">{item.quantity}x</span>
                                   <div>
                                      <p className="text-sm font-black text-gray-800 uppercase leading-none">{item.product_name}</p>
                                      {item.variant_name && <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{item.variant_name}</p>}
                                   </div>
                                </div>
                                <span className="text-gray-400 font-black tracking-tighter text-sm italic">S/ {(item.price * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-[#ff0095] border-b border-[#ff0095]/10 pb-2">Logística de entrega</h5>
                          <div className="bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200">
                             {order.order_type === 'delivery' ? (
                               <>
                                 <span className="text-[8px] font-black text-blue-500 uppercase block mb-1">Destino Delivery</span>
                                 <p className="text-sm font-bold text-gray-700 leading-relaxed uppercase italic">
                                   {order.address || 'No se especificó dirección'}
                                 </p>
                               </>
                             ) : (
                               <>
                                 <span className="text-[8px] font-black text-purple-500 uppercase block mb-1">Modalidad</span>
                                 <p className="text-sm font-bold text-gray-700 leading-relaxed uppercase italic">
                                   EL CLIENTE RECOGE EN EL PUESTO 651
                                 </p>
                               </>
                             )}
                          </div>
                          
                          <a 
                            href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}?text=Hola ${order.customer_name}, tu pedido #${order.id.slice(-6)} ya está siendo procesado.`}
                            target="_blank"
                            className="flex items-center justify-center gap-3 w-full py-4 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all"
                          >
                             <i className="fa-brands fa-whatsapp text-sm"></i> Notificar al cliente
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-12 max-w-4xl mx-auto animate-reveal">
               <h3 className="text-[11px] font-black uppercase tracking-widest text-[#ff0095]">Identidad Visual</h3>
               <div className="flex flex-col md:flex-row gap-12">
                  <div onClick={() => logoInputRef.current?.click()} className="w-48 h-48 bg-white rounded-3xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer shadow-sm">
                    {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain p-4" /> : <i className="fa-solid fa-camera text-gray-200"></i>}
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                  </div>
                  <div className="flex-grow space-y-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Dirección de la tienda</label>
                       <input type="text" placeholder="Dirección" defaultValue={config.address} onBlur={(e) => handleUpdateConfig({ address: e.target.value })} className="w-full p-5 bg-white rounded-2xl border outline-none focus:border-[#ff0095]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">WhatsApp Principal</label>
                         <input type="text" placeholder="WhatsApp" defaultValue={config.whatsapp_number} onBlur={(e) => handleUpdateConfig({ whatsapp_number: e.target.value })} className="w-full p-5 bg-white rounded-2xl border outline-none focus:border-[#ff0095]" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Número de Yape</label>
                         <input type="text" placeholder="Yape" defaultValue={config.yape_number} onBlur={(e) => handleUpdateConfig({ yape_number: e.target.value })} className="w-full p-5 bg-white rounded-2xl border outline-none focus:border-[#ff0095]" />
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-8 max-w-5xl mx-auto animate-reveal">
              <div className="flex justify-between items-center bg-white p-8 rounded-3xl border shadow-sm">
                <h3 className="text-xl font-black brand-font italic uppercase">Cartilla de Platos</h3>
                <button onClick={() => setEditingProduct({ is_popular: false, is_combo: false, price: 0 })} className="bg-black text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/20 hover:bg-[#ff0095] transition-all">Agregar Plato</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-3xl flex items-center justify-between border group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <img src={p.image_url} className="w-16 h-16 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-black text-sm uppercase leading-none">{p.name}</h4>
                        <p className="text-[#ff0095] font-black text-xs mt-1 italic">S/ {p.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingProduct(p)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-black transition-all"><i className="fa-solid fa-pen text-xs"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-[700] bg-black/90 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-12 space-y-6 shadow-2xl">
            <h2 className="font-black brand-font text-2xl uppercase italic text-center">Editar <span className="text-[#ff0095]">Plato</span></h2>
            <div className="space-y-4">
               <input type="text" placeholder="Nombre del plato" value={editingProduct.name || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full p-5 bg-gray-50 rounded-2xl border outline-none focus:border-[#ff0095]" />
               <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Precio (S/)" value={editingProduct.price || 0} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="p-5 bg-gray-50 rounded-2xl border outline-none focus:border-[#ff0095]" />
                  <select value={editingProduct.category_id || ''} onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })} className="p-5 bg-gray-50 rounded-2xl border outline-none focus:border-[#ff0095]">
                     <option value="">Categoría</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <textarea placeholder="Descripción del plato..." value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full p-5 bg-gray-50 rounded-2xl border h-32 resize-none outline-none focus:border-[#ff0095]" />
            </div>
            <div className="pt-4 space-y-3">
               <button onClick={saveProduct} disabled={saving} className="w-full bg-[#ff0095] text-white py-5 rounded-2xl font-black uppercase shadow-xl shadow-[#ff0095]/20 hover:scale-[1.02] transition-all">
                 {saving ? 'Guardando...' : 'Publicar Plato'}
               </button>
               <button onClick={() => setEditingProduct(null)} className="w-full py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
