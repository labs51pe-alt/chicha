
import React, { useState, useMemo, useEffect } from 'react';
import { MenuItem, CartItem, ItemVariant, Category, AppConfig } from './types';
import { supabase } from './lib/supabase';
import { MenuItemCard } from './components/MenuItemCard';
import { Cart } from './components/Cart';
import { ItemDetailModal } from './components/ItemDetailModal';
import { WelcomeSlide } from './components/WelcomeSlide';
import { AdminPanel } from './components/AdminPanel';

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('todo');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    id: 1,
    logo_url: '',
    slide_urls: [],
    whatsapp_number: '51901885960',
    yape_number: '901885960',
    yape_name: 'Chicha',
    instagram_url: '',
    facebook_url: '',
    tiktok_url: '',
    address: 'Mercado 2 Surquillo',
    opening_hours: '10:00 AM - 5:00 PM'
  });

  useEffect(() => {
    const handleScroll = () => { setScrolled(window.scrollY > 40); };
    window.addEventListener('scroll', handleScroll);
    fetchInitialData();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchInitialData = async () => {
    try {
      const [catsRes, prodsRes, configRes] = await Promise.all([
        supabase.from('categories').select('*').order('order', { ascending: true }),
        supabase.from('products').select('*, variants(*)'),
        supabase.from('app_config').select('*').single()
      ]);

      if (catsRes.data) {
        setCategories([{ id: 'todo', name: 'Todo', icon: 'fa-utensils' }, ...catsRes.data]);
      } else {
        setCategories([{ id: 'todo', name: 'Todo', icon: 'fa-utensils' }]);
      }

      if (prodsRes.data) setProducts(prodsRes.data);
      if (configRes.data) setAppConfig(configRes.data);
      
    } catch (error) {
      console.error("Supabase error:", error);
    } finally {
      setTimeout(() => setIsInitialLoading(false), 800);
    }
  };

  const filteredMenu = useMemo(() => {
    return products.filter(item => {
      const matchesCategory = selectedCategory === 'todo' || item.category_id === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, products]);

  const addToCart = (item: MenuItem, variant?: ItemVariant, quantity: number = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id && (i.selectedVariant?.id === variant?.id || (!i.selectedVariant && !variant)));
      if (existing) {
        return prev.map(i => (i.id === item.id && (i.selectedVariant?.id === variant?.id || (!i.selectedVariant && !variant))) ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity, selectedVariant: variant }];
    });
    setSelectedItemForModal(null);
  };

  const updateQuantity = (id: string, delta: number, variantId?: string) => {
    setCartItems(prev => prev.map(i => {
      if (i.id === id && (i.selectedVariant?.id === variantId || (!i.selectedVariant && !variantId))) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : null;
      }
      return i;
    }).filter(Boolean) as CartItem[]);
  };

  if (isInitialLoading) return (
    <div className="fixed inset-0 bg-[#fffef5] flex flex-col items-center justify-center z-[1000]">
       <div className="w-10 h-10 border-[3px] border-black/5 border-t-[#ff0095] rounded-full animate-spin"></div>
    </div>
  );

  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={`min-h-screen bg-[#fffef5] text-black relative ${showWelcome ? 'overflow-hidden max-h-screen' : ''}`}>
      
      {showWelcome && (
        <WelcomeSlide 
          onEnter={() => setShowWelcome(false)} 
          customLogo={appConfig.logo_url}
          customSlides={appConfig.slide_urls || []}
          socials={{
            instagram: appConfig.instagram_url,
            facebook: appConfig.facebook_url,
            tiktok: appConfig.tiktok_url
          }}
        />
      )}

      {/* Header Premium con Colores del Logo */}
      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? 'glass-header py-4' : 'bg-transparent py-10'} ${showWelcome ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'}`}>
        <div className="max-w-7xl mx-auto px-8 md:px-12 flex items-center justify-between">
          <div className="cursor-pointer group flex items-center gap-4" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            {appConfig.logo_url ? (
              <img src={appConfig.logo_url} className={`transition-all duration-700 ${scrolled ? 'h-10' : 'h-16'} object-contain filter brightness-0`} />
            ) : (
              <div className="flex flex-col">
                <h1 className={`script-font transition-all duration-700 ${scrolled ? 'text-3xl' : 'text-5xl'} text-black leading-none`}>Chicha</h1>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[#ff0095]">Cevichería Piurana</span>
              </div>
            )}
          </div>

          <button 
              onClick={() => setIsCartOpen(true)}
              className="relative bg-black text-white px-8 py-4 rounded-2xl flex items-center gap-5 hover:bg-[#ff0095] transition-all duration-500 shadow-2xl active:scale-95 group"
          >
              <i className="fa-solid fa-cart-shopping text-xs group-hover:rotate-12 transition-transform"></i>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] hidden md:block">Mi Canasta</span>
              {totalItemsCount > 0 && (
                  <span className="bg-[#ff0095] text-white w-6 h-6 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg">
                      {totalItemsCount}
                  </span>
              )}
          </button>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-8 md:px-12 pt-56 pb-40 transition-all duration-[1s] ${showWelcome ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
        
        {/* Hero Section con Playfair Display y colores de Marca */}
        <div className="mb-24 flex flex-col lg:flex-row lg:items-end justify-between gap-16">
            <div className="max-w-2xl animate-reveal">
                <div className="w-16 h-[4px] bg-[#ff0095] mb-10 rounded-full"></div>
                <h2 className="brand-font text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] text-black">
                  Explora nuestro <br/>
                  <span className="text-[#ff0095] italic">Menú</span>
                </h2>
                <p className="text-gray-500 text-xl font-medium leading-relaxed tracking-tight border-l-4 border-[#fdf9c4] pl-6 italic">
                  "El sabor del norte que conquistó la capital."
                </p>
            </div>
            
            <div className="w-full lg:w-[450px] space-y-4 animate-reveal" style={{animationDelay: '0.2s'}}>
               <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 px-2 block">Buscador Inteligente</label>
               <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Escribe el nombre de un plato..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#fdf9c4]/30 px-8 py-6 rounded-[2rem] outline-none border-2 border-transparent focus:border-[#ff0095]/20 focus:bg-white font-bold transition-all duration-500 text-sm italic"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center group-focus-within:bg-[#ff0095] transition-all duration-500">
                    <i className="fa-solid fa-magnifying-glass text-[10px]"></i>
                  </div>
               </div>
            </div>
        </div>

        {/* Categorías Premium usando el color crema del logo */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-10 mb-20 border-b-2 border-[#fdf9c4] animate-reveal" style={{animationDelay: '0.4s'}}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-4 px-10 py-5 rounded-2xl transition-all duration-500 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] border-2 ${
                selectedCategory === cat.id 
                  ? 'bg-black text-white border-black scale-105 shadow-xl' 
                  : 'bg-[#fdf9c4]/40 text-black border-transparent hover:border-[#ff0095]/30'
              }`}
            >
              <i className={`fa-solid ${cat.icon || 'fa-utensils'} ${selectedCategory === cat.id ? 'text-[#ff0095]' : 'text-black/20'}`}></i>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid de Productos con Tarjetas Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {filteredMenu.length > 0 ? filteredMenu.map((item, idx) => (
            <div key={item.id} style={{ animationDelay: `${idx * 0.05}s` }}>
              <MenuItemCard 
                item={item} 
                onAddToCart={() => setSelectedItemForModal(item)} 
                onShowDetails={() => setSelectedItemForModal(item)} 
              />
            </div>
          )) : (
            <div className="col-span-full py-40 text-center">
               <p className="font-black text-black/10 uppercase tracking-[1em] text-[10px]">Sin resultados</p>
            </div>
          )}
        </div>
      </main>

      {/* Botón Admin Discreto */}
      {!showWelcome && (
        <button 
          onClick={() => setIsAdminOpen(true)}
          className="fixed bottom-12 right-12 w-14 h-14 bg-[#fdf9c4] text-black rounded-full flex items-center justify-center transition-all duration-500 z-[150] shadow-xl hover:bg-[#ff0095] hover:text-white"
        >
          <i className="fa-solid fa-gear text-lg"></i>
        </button>
      )}

      {/* Modales con Acentos de Marca */}
      <ItemDetailModal item={selectedItemForModal} onClose={() => setSelectedItemForModal(null)} onAddToCart={addToCart} />
      
      <Cart 
        isOpen={isCartOpen} 
        onToggle={() => setIsCartOpen(false)} 
        items={cartItems} 
        onRemove={(id, vId) => updateQuantity(id, -99, vId)} 
        onUpdateQuantity={updateQuantity} 
        whatsappNumber={appConfig.whatsapp_number} 
      />
      
      <AdminPanel 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
        categories={categories.filter(c => c.id !== 'todo')}
        products={products}
        config={appConfig}
        onRefresh={() => fetchInitialData()}
      />
    </div>
  );
};

export default App;
