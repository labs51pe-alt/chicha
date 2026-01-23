
import React, { useState, useRef, useEffect } from 'react';
import { MenuItem, Category, AppConfig } from '../types';
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
  // Usar sessionStorage para persistir el login mientras la pestaña esté abierta
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('admin_session') === 'active';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'branding' | 'products'>('branding');
  const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);
  const [saving, setSaving] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const slideInputRef = useRef<HTMLInputElement>(null);
  const prodImgInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
    if (!error) {
      // Importante: No cerrar el panel aquí, solo refrescar datos
      onRefresh();
    }
    setSaving(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'slide' | 'product') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (type === 'logo') {
          await handleUpdateConfig({ logo_url: base64 });
        } else if (type === 'slide') {
          const newSlides = [...(config.slide_urls || []), base64].slice(-5);
          await handleUpdateConfig({ slide_urls: newSlides });
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

    let result;
    if (editingProduct.id) {
      result = await supabase.from('products').update(productData).eq('id', editingProduct.id);
    } else {
      result = await supabase.from('products').insert([productData]).select();
    }

    if (!result.error) {
      setEditingProduct(null);
      onRefresh();
    }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar este plato?')) return;
    await supabase.from('products').delete().eq('id', id);
    onRefresh();
  };

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 text-center shadow-2xl">
          <div className="mb-10">
            <div className="w-24 h-24 bg-[#ff0095]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-lock text-[#ff0095] text-4xl"></i>
            </div>
            <h2 className="font-black brand-font text-3xl uppercase tracking-tight">Panel Admin</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Introduce la clave para gestionar</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="password" 
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-gray-50 p-6 rounded-2xl text-center font-black outline-none border-2 transition-all ${loginError ? 'border-red-500 animate-shake' : 'border-transparent focus:border-[#ff0095]/20'}`}
              autoFocus
            />
            <button className="w-full bg-black text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-[#ff0095] transition-all shadow-xl active:scale-95">
              Acceder Ahora
            </button>
            <button type="button" onClick={onClose} className="text-[11px] font-black uppercase text-gray-300 hover:text-gray-500 tracking-[0.3em] pt-4 block mx-auto transition-colors">Volver a la carta</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="bg-[#fffdf0] w-full max-w-7xl h-full rounded-[4rem] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-white/10">
        
        {/* Sidebar Nav */}
        <div className="w-full md:w-80 bg-white p-12 flex flex-col gap-6 border-r border-gray-100">
          <div className="mb-10">
            <h2 className="text-2xl font-black brand-font text-black">Chicha <span className="text-[#ff0095]">Admin</span></h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión de Negocio A1</p>
          </div>
          
          <button onClick={() => setActiveTab('branding')} className={`flex items-center gap-5 p-6 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'branding' ? 'bg-[#ff0095] text-white shadow-xl scale-105' : 'hover:bg-gray-100 text-gray-400'}`}>
            <i className="fa-solid fa-gem text-xl"></i>Identidad
          </button>
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-5 p-6 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-[#ff0095] text-white shadow-xl scale-105' : 'hover:bg-gray-100 text-gray-400'}`}>
            <i className="fa-solid fa-utensils text-xl"></i>Platos del Menú
          </button>
          
          <div className="mt-auto pt-10">
            <button onClick={handleLogout} className="w-full p-6 rounded-[2rem] bg-black text-white text-[11px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg active:scale-95">
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-12 no-scrollbar bg-[#fffdf0]">
          <div className="max-w-4xl mx-auto">
            
            {activeTab === 'branding' && (
              <div className="space-y-16 animate-in slide-in-from-right-10 duration-500">
                <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="md:col-span-1 space-y-6">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff0095]">Logotipo del Local</h3>
                     <div className="aspect-square bg-white rounded-[3rem] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group cursor-pointer shadow-sm hover:border-[#ff0095]/20 transition-all" onClick={() => logoInputRef.current?.click()}>
                        {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain p-8" /> : <i className="fa-solid fa-cloud-arrow-up text-gray-200 text-4xl"></i>}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest transition-all">Cambiar Logo</div>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                     </div>
                  </div>
                  
                  <div className="md:col-span-2 space-y-8">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff0095]">Datos del Negocio</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase px-2">WhatsApp de Pedidos</label>
                          <input type="text" placeholder="51..." defaultValue={config.whatsapp_number} onBlur={(e) => handleUpdateConfig({ whatsapp_number: e.target.value })} className="w-full bg-white p-5 rounded-2xl font-bold outline-none border border-gray-100 focus:border-[#ff0095]/20" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase px-2">Celular para Yape</label>
                          <input type="text" placeholder="9..." defaultValue={config.yape_number} onBlur={(e) => handleUpdateConfig({ yape_number: e.target.value })} className="w-full bg-white p-5 rounded-2xl font-bold outline-none border border-gray-100 focus:border-[#ff0095]/20" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase px-2">Dirección del Local</label>
                          <input type="text" defaultValue={config.address} onBlur={(e) => handleUpdateConfig({ address: e.target.value })} className="w-full bg-white p-5 rounded-2xl font-bold outline-none border border-gray-100 focus:border-[#ff0095]/20" />
                        </div>
                     </div>
                  </div>
                </section>

                <section className="space-y-8">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff0095]">Redes Sociales (URLs)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <input type="text" placeholder="Instagram" defaultValue={config.instagram_url} onBlur={(e) => handleUpdateConfig({ instagram_url: e.target.value })} className="w-full bg-white p-5 rounded-2xl font-bold outline-none border border-gray-100" />
                    <input type="text" placeholder="Facebook" defaultValue={config.facebook_url} onBlur={(e) => handleUpdateConfig({ facebook_url: e.target.value })} className="w-full bg-white p-5 rounded-2xl font-bold outline-none border border-gray-100" />
                    <input type="text" placeholder="TikTok" defaultValue={config.tiktok_url} onBlur={(e) => handleUpdateConfig({ tiktok_url: e.target.value })} className="w-full bg-white p-5 rounded-2xl font-bold outline-none border border-gray-100" />
                  </div>
                </section>

                <section className="space-y-8">
                   <div className="flex justify-between items-center">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff0095]">Galería de Bienvenida (Máx 5)</h3>
                     <button onClick={() => slideInputRef.current?.click()} className="text-[10px] font-black bg-black text-white px-6 py-3 rounded-full uppercase tracking-widest hover:bg-[#ff0095] transition-all">Subir Foto</button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                      {config.slide_urls?.map((url, i) => (
                        <div key={i} className="aspect-[4/5] bg-white rounded-[2rem] overflow-hidden relative group shadow-sm border border-gray-100">
                           <img src={url} className="w-full h-full object-cover" />
                           <button onClick={() => handleUpdateConfig({ slide_urls: config.slide_urls.filter((_, idx) => idx !== i) })} className="absolute top-3 right-3 w-10 h-10 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center justify-center"><i className="fa-solid fa-trash text-xs"></i></button>
                        </div>
                      ))}
                      <input type="file" ref={slideInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'slide')} />
                   </div>
                </section>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-10 animate-in slide-in-from-right-10 duration-500">
                <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-gray-50">
                  <div>
                    <h3 className="text-2xl font-black brand-font text-black">Gestión de Menú</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Publica tus mejores platos</p>
                  </div>
                  <button onClick={() => setEditingProduct({ is_popular: false, is_combo: false, price: 0 })} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-[#ff0095] transition-all active:scale-95">
                    + Nuevo Plato
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-[2.5rem] flex items-center justify-between border border-gray-100 group hover:shadow-2xl transition-all">
                      <div className="flex items-center gap-6">
                        <img src={p.image_url} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
                        <div>
                          <h4 className="font-black brand-font uppercase text-sm leading-tight text-gray-900">{p.name}</h4>
                          <span className="text-[11px] font-black text-[#ff0095] uppercase tracking-widest">S/ {p.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setEditingProduct(p)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black hover:bg-white transition-all shadow-sm"><i className="fa-solid fa-pen"></i></button>
                        <button onClick={() => deleteProduct(p.id)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-sm"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-[700] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-[#fffdf0] w-full max-w-2xl rounded-[4rem] overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">
            <div className="p-10 border-b bg-white flex justify-between items-center">
              <h2 className="font-black brand-font uppercase text-[#ff0095] text-2xl">Editor de Manjar</h2>
              <button onClick={() => setEditingProduct(null)} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div className="p-10 overflow-y-auto no-scrollbar space-y-8">
              <div className="flex flex-col items-center gap-6">
                <div onClick={() => prodImgInputRef.current?.click()} className="w-44 h-44 rounded-[3rem] bg-white border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative cursor-pointer group shadow-sm">
                  {editingProduct.image_url ? <img src={editingProduct.image_url} className="w-full h-full object-cover" /> : <i className="fa-solid fa-camera text-gray-200 text-3xl"></i>}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest transition-opacity">Subir Foto</div>
                </div>
                <input type="file" ref={prodImgInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'product')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase px-2">Nombre del Plato</label>
                   <input type="text" placeholder="Ej: Ceviche Malcriado" value={editingProduct.name || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="bg-white p-5 rounded-2xl font-bold outline-none w-full border border-gray-100" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase px-2">Precio S/</label>
                   <input type="number" placeholder="0.00" value={editingProduct.price || 0} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="bg-white p-5 rounded-2xl font-bold outline-none w-full border border-gray-100" />
                </div>
              </div>
              <textarea placeholder="Descripción del sabor..." value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className="bg-white p-6 rounded-2xl font-bold outline-none h-32 resize-none w-full border border-gray-100" />
              <select value={editingProduct.category_id || ''} onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })} className="w-full bg-white p-5 rounded-2xl font-bold outline-none border border-gray-100">
                <option value="">Selecciona Categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-10 p-8 bg-white rounded-[2rem] shadow-sm border border-gray-50">
                <label className="flex items-center gap-3 font-black text-[11px] uppercase cursor-pointer text-gray-500 hover:text-[#ff0095] transition-colors"><input type="checkbox" checked={editingProduct.is_popular} onChange={(e) => setEditingProduct({...editingProduct, is_popular: e.target.checked})} className="accent-[#ff0095] w-6 h-6" /> El Favorito</label>
                <label className="flex items-center gap-3 font-black text-[11px] uppercase cursor-pointer text-gray-500 hover:text-[#ff0095] transition-colors"><input type="checkbox" checked={editingProduct.is_combo} onChange={(e) => setEditingProduct({...editingProduct, is_combo: e.target.checked})} className="accent-[#ff0095] w-6 h-6" /> Es Combo</label>
              </div>
            </div>
            <div className="p-10 border-t bg-white">
              <button onClick={saveProduct} disabled={saving} className="w-full bg-[#ff0095] text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4">
                {saving ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                {saving ? 'GUARDANDO...' : 'PUBLICAR PLATO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
