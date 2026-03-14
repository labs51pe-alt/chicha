
import React, { useState, useEffect } from 'react';
import { MenuItem, ItemVariant } from '../types';

interface ItemDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, variant?: ItemVariant, quantity?: number) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  onAddToCart
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item?.variants && item.variants.length > 0) {
      setSelectedVariant(item.variants[0]);
    } else {
      setSelectedVariant(undefined);
    }
    setQuantity(1);
  }, [item]);

  if (!item) return null;

  const currentPrice = selectedVariant ? selectedVariant.price : item.price;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-2 md:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
        <div className="relative h-48 sm:h-80">
          {/* FIX: Changed 'item.image' to 'item.image_url' to match MenuItem interface */}
          <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:text-[#ff0095] transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
             <span className="bg-[#ff0095]/10 text-[#ff0095] text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{item.category}</span>
             {/* FIX: Changed 'item.isPopular' to 'item.is_popular' to match MenuItem interface */}
             {item.is_popular && (
               <span className="bg-orange-100 text-orange-600 text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Favorito</span>
             )}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 brand-font leading-tight">{item.name}</h2>
          <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-6">{item.description}</p>

          {item.variants && item.variants.length > 0 && (
            <div className="mb-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Selecciona Opción</h4>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {item.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`p-2 md:p-3 rounded-xl md:rounded-2xl border-2 text-left transition-all ${selectedVariant?.id === variant.id ? 'border-[#ff0095] bg-[#ff0095]/5' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="text-xs md:text-sm font-bold">{variant.name}</div>
                    <div className={`text-[10px] md:text-xs ${selectedVariant?.id === variant.id ? 'text-[#ff0095]' : 'text-gray-400'}`}>S/ {variant.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-gray-100 gap-4">
            <div className="flex items-center gap-2 md:gap-4 bg-gray-50 p-1 md:p-2 rounded-xl md:rounded-2xl border">
               <button 
                 onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                 className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-[#ff0095] transition-colors"
               >
                 <i className="fa-solid fa-minus text-xs"></i>
               </button>
               <span className="text-base md:text-lg font-black w-6 text-center">{quantity}</span>
               <button 
                 onClick={() => setQuantity(prev => prev + 1)}
                 className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-[#ff0095] transition-colors"
               >
                 <i className="fa-solid fa-plus text-xs"></i>
               </button>
            </div>
            
            <button 
              onClick={() => onAddToCart(item, selectedVariant, quantity)}
              className="flex-grow bg-[#ff0095] hover:bg-black text-white py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-lg flex items-center justify-center gap-2 md:gap-3 shadow-lg transform active:scale-95 transition-all"
            >
              <span className="hidden xs:inline">AGREGAR</span>
              <span>S/ {(currentPrice * quantity).toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
