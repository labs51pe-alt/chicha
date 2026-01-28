
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
  const [logoClicks, setLogoClicks] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    id: 1,
    logo_url: '',
    slide_urls: [],
    whatsapp_number: '51901885960',
    yape_number: '901885960',
    yape_name: 'Chicha',
    plin_number: '901885960',
    plin_name: 'Chicha',
    instagram_url: '',
    facebook_url: '',
    tiktok_url: '',
    address: 'Mercado 2 de Surquillo puesto 651.',
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

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        setIsAdminOpen(true);
        return 0;
      }
      return newCount;
    });
    const timer = setTimeout(() => setLogoClicks(0), 2000);
    return () => clearTimeout(timer);
  };

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

  const clearCart = () => setCartItems([]);

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
            tiktok: appConfig.tiktok_url,
            whatsapp: appConfig.whatsapp_number
          }}
          onLogoClick={handleLogoClick}
        />
      )}

      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? 'glass-header py-3 shadow-md' : 'bg-transparent py-8 md:py-12'} ${showWelcome ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'}`}>
        <div className="max-w-7xl mx-auto px-8 md:px-12 flex items-center justify-between">
          <div className="cursor-pointer group flex items-center gap-4" onClick={handleLogoClick}>
            {appConfig.logo_url ? (
              <img 
                src={appConfig.logo_url} 
                className={`transition-all duration-700 ${scrolled ? 'h-16 md:h-20' : 'h-28 md:h-40'} object-contain drop-shadow-2xl`} 
                alt="Chicha Logo" 
              />
            ) : (
              <div className="flex flex-col">
                <h1 className={`script-font transition-all duration-700 ${scrolled ? 'text-4xl' : 'text-7xl'} text-black leading-none`}>Chicha</h1>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff0095]">Cevichería Piurana</span>
              </div>
            )}
          </div>

          <button 
              onClick={() => setIsCartOpen(true)}
              className="relative bg-black text-white px-8 py-5 rounded-[2rem] flex items-center gap-5 hover:bg-[#ff0095] transition-all duration-500 shadow-2xl active:scale-95 group"
          >
              <i className="fa-solid fa-cart-shopping text-sm group-hover:rotate-12 transition-transform"></i>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] hidden md:block">Mi Canasta</span>
              {totalItemsCount > 0 && (
                  <span className="bg-[#ff0095] text-white w-7 h-7 rounded-2xl flex items-center justify-center font-black text-[12px] shadow-lg">
                      {totalItemsCount}
                  </span>
              )}
          </button>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-8 md:px-12 pt-64 md:pt-80 pb-20 transition-all duration-[1s] ${showWelcome ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
        <div className="mb-24 flex flex-col lg:flex-row lg:items-end justify-between gap-16">
            <div className="max-w-2xl animate-reveal">
                <div className="w-16 h-[4px] bg-[#ff0095] mb-10 rounded-full"></div>
                <h2 className="brand-font text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] text-black uppercase italic">
                  Carta de <br/>
                  <span className="text-[#ff0095]">Sabor</span>
                </h2>
                <p className="text-gray-500 text-xl font-medium leading-relaxed tracking-tight border-l-4 border-[#fdf9c4] pl-6 italic">
                  "El sabor del norte que conquistó la capital."
                </p>
            </div>
            
            <div className="w-full lg:w-[450px] animate-reveal" style={{animationDelay: '0.2s'}}>
               <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Busca tu antojo..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#fdf9c4]/30 px-8 py-6 rounded-[2.5rem] outline-none border-2 border-transparent focus:border-[#ff0095]/20 focus:bg-white font-bold transition-all duration-500 text-sm italic"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
                    <i className="fa-solid fa-magnifying-glass text-[10px]"></i>
                  </div>
               </div>
            </div>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-10 mb-20 border-b-2 border-[#fdf9c4]">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 mb-24">
          {filteredMenu.length > 0 ? filteredMenu.map((item, idx) => (
            <MenuItemCard key={item.id} item={item} onAddToCart={() => setSelectedItemForModal(item)} onShowDetails={() => setSelectedItemForModal(item)} />
          )) : (
            <div className="col-span-full py-40 text-center opacity-20 font-black uppercase tracking-[1em] text-[10px]">Sin resultados</div>
          )}
        </div>
      </main>

      <footer className="bg-[#fdf9c4]/40 border-t border-[#fdf9c4] py-16">
        <div className="max-w-7xl mx-auto px-8 md:px-12 flex flex-col md:flex-row items-center justify-between gap-12">
           <div className="flex flex-col items-center md:items-start group cursor-pointer" onClick={handleLogoClick}>
              {appConfig.logo_url ? <img src={appConfig.logo_url} className="h-24 md:h-32 object-contain" /> : <h2 className="script-font text-6xl">Chicha</h2>}
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff0095] mt-4">Sabor Piurano en Lima</span>
           </div>
           <div className="text-center md:text-left">
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-black/30 mb-4 block">Encuéntranos</span>
              <p className="brand-font text-2xl font-black italic tracking-tighter">{appConfig.address}</p>
           </div>
           <div className="flex gap-6">
              {appConfig.instagram_url && <a href={appConfig.instagram_url} target="_blank" className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center hover:bg-[#ff0095] transition-all"><i className="fa-brands fa-instagram text-2xl"></i></a>}
              {appConfig.tiktok_url && <a href={appConfig.tiktok_url} target="_blank" className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center hover:bg-[#ff0095] transition-all"><i className="fa-brands fa-tiktok text-2xl"></i></a>}
           </div>
        </div>
      </footer>

      {/* Botón Flotante de Ayuda WhatsApp - Se oculta si isAdminOpen es true */}
      {!isAdminOpen && (
        <a 
          href={`https://wa.me/${appConfig.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent('¡Hola Chicha! Necesito ayuda con mi pedido 🌶️')}`} 
          target="_blank" 
          className="fixed bottom-6 right-6 w-16 h-16 bg-[#25d366] text-white rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(37,211,102,0.6)] z-[999] hover:scale-110 active:scale-95 transition-all animate-bounce hover:animate-none"
          aria-label="Ayuda por WhatsApp"
        >
          <i className="fa-brands fa-whatsapp text-3xl"></i>
        </a>
      )}

      <ItemDetailModal item={selectedItemForModal} onClose={() => setSelectedItemForModal(null)} onAddToCart={addToCart} />
      <Cart isOpen={isCartOpen} onToggle={() => setIsCartOpen(false)} items={cartItems} onRemove={(id, vId) => updateQuantity(id, -99, vId)} onUpdateQuantity={updateQuantity} onClearCart={clearCart} config={appConfig} />
      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} categories={categories.filter(c => c.id !== 'todo')} products={products} config={appConfig} onRefresh={() => fetchInitialData()} />
    </div>
  );
};

export default App;
