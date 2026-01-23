
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="relative h-64 sm:h-80">
          {/* FIX: Changed 'item.image' to 'item.image_url' to match MenuItem interface */}
          <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:text-[#e91e63] transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
             <span className="bg-[#e91e63]/10 text-[#e91e63] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{item.category}</span>
             {/* FIX: Changed 'item.isPopular' to 'item.is_popular' to match MenuItem interface */}
             {item.is_popular && (
               <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Favorito</span>
             )}
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 mb-2 brand-font">{item.name}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{item.description}</p>

          {item.variants && item.variants.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Selecciona Opción</h4>
              <div className="grid grid-cols-2 gap-3">
                {item.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${selectedVariant?.id === variant.id ? 'border-[#e91e63] bg-[#e91e63]/5' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="text-sm font-bold">{variant.name}</div>
                    <div className={`text-xs ${selectedVariant?.id === variant.id ? 'text-[#e91e63]' : 'text-gray-400'}`}>S/ {variant.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border">
               <button 
                 onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                 className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-[#e91e63] transition-colors"
               >
                 <i className="fa-solid fa-minus"></i>
               </button>
               <span className="text-lg font-black w-6 text-center">{quantity}</span>
               <button 
                 onClick={() => setQuantity(prev => prev + 1)}
                 className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-[#e91e63] transition-colors"
               >
                 <i className="fa-solid fa-plus"></i>
               </button>
            </div>
            
            <button 
              onClick={() => onAddToCart(item, selectedVariant, quantity)}
              className="flex-grow ml-6 bg-[#e91e63] hover:bg-[#c2185b] text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg transform active:scale-95 transition-all"
            >
              <span className="hidden sm:inline">AGREGAR</span>
              <span>S/ {(currentPrice * quantity).toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
