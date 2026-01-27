
import React, { useState } from 'react';
import { MenuItem } from '../types';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  onShowDetails: (item: MenuItem) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onAddToCart,
  onShowDetails
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group flex flex-col h-full rounded-[2.5rem] overflow-hidden premium-card border-2 border-[#fdf9c4]/30 cursor-pointer animate-reveal"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onShowDetails(item)}
    >
      {/* Imagen con contenedor en color crema suave */}
      <div className="relative aspect-[1/1] overflow-hidden bg-[#fdf9c4]/20">
        <img 
          src={item.image_url || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600&auto=format&fit=crop'} 
          alt={item.name} 
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600&auto=format&fit=crop'; }}
          className={`w-full h-full object-cover transition-transform duration-[1.5s] cubic-bezier(0.23, 1, 0.32, 1) ${isHovered ? 'scale-110' : 'scale-100'}`}
        />
        
        {/* Badges Premium */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          {item.is_popular && (
            <div className="bg-black text-white text-[9px] font-black tracking-[0.2em] px-4 py-2 rounded-full uppercase">
              FAVORITO
            </div>
          )}
          {item.is_combo && (
            <div className="bg-[#ff0095] text-white text-[9px] font-black tracking-[0.2em] px-4 py-2 rounded-full uppercase">
              COMBO
            </div>
          )}
        </div>
      </div>
      
      {/* Cuerpo de la Tarjeta */}
      <div className="p-8 flex flex-col flex-grow">
        <h3 className="brand-font text-2xl font-black text-black group-hover:text-[#ff0095] transition-colors leading-[1.1] uppercase italic mb-3">
          {item.name}
        </h3>
        
        <p className="text-[13px] text-gray-400 font-medium leading-relaxed mb-8 flex-grow line-clamp-2 italic">
          {item.description || "Delicioso plato preparado con el auténtico sabor del norte peruano."}
        </p>
        
        <div className="flex items-center justify-between pt-6 border-t border-[#fdf9c4]">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] mb-1">Precio</span>
              <span className="text-2xl font-black text-black tracking-tighter">
                <span className="text-[14px] font-bold text-[#ff0095] mr-1">S/</span>
                {item.price.toFixed(2)}
              </span>
           </div>
           
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onAddToCart(item);
             }}
             className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
               isHovered ? 'bg-[#ff0095] text-white rotate-6 shadow-xl' : 'bg-[#fdf9c4] text-black'
             }`}
           >
             <i className="fa-solid fa-plus text-sm"></i>
           </button>
        </div>
      </div>
    </div>
  );
};
