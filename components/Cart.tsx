
import React, { useState } from 'react';
import { CartItem } from '../types';
import { APP_CONFIG } from '../data';

interface CartProps {
  items: CartItem[];
  onRemove: (id: string, variantId?: string) => void;
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  whatsappNumber: string;
}

type OrderType = 'delivery' | 'pickup';

export const Cart: React.FC<CartProps> = ({
  items,
  onRemove,
  onUpdateQuantity,
  isOpen,
  onToggle,
  whatsappNumber
}) => {
  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [hasCopiedYape, setHasCopiedYape] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const total = items.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.price;
    return sum + price * item.quantity;
  }, 0);

  const handleCopyYape = () => {
    setIsCopying(true);
    navigator.clipboard.writeText(APP_CONFIG.yapeNumber);
    setTimeout(() => {
      setHasCopiedYape(true);
      setIsCopying(false);
    }, 600);
  };

  const handleWhatsAppOrder = () => {
    if (!hasCopiedYape) return;

    const typeLabel = orderType === 'delivery' ? '🛵 DELIVERY' : '🏠 RECOJO';
    const addressInfo = orderType === 'delivery' ? `\n📍 *Dirección:* ${address}` : '';

    const itemsText = items.map(item =>
        `• ${item.quantity}x ${item.name} ${item.selectedVariant ? `(${item.selectedVariant.name})` : ''}`
      ).join('\n');

    const message = encodeURIComponent(
      `¡Habla Chica! 🌶️ Soy *${customerName || 'Cliente'}* 😎\n` +
      `*MODALIDAD:* ${typeLabel}\n` +
      `--------------------------------\n` +
      `📋 *MI PEDIDO:*\n` +
      itemsText +
      `\n-----------------------------\n` +
      `💰 *TOTAL: S/ ${total.toFixed(2)}*${addressInfo}\n` +
      `-----------------------------\n` +
      `✅ *¡Confirmado! Ya copié el número para pagar, ¡métele limon y aji a mi pedido!*`
    );

    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const isFormValid =
    customerName.trim().length >= 3 &&
    (orderType === 'pickup' || (orderType === 'delivery' && address.trim().length >= 5));

  const canSubmit = isFormValid && hasCopiedYape;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-end bg-black/80 backdrop-blur-sm transition-all duration-500">
      <div className="bg-[#fffef5] w-full max-w-md h-full flex flex-col shadow-2xl border-l-4 border-[#fdf9c4]">
        
        {/* Header con el Rosa de Marca */}
        <div className="p-8 border-b-2 border-[#fdf9c4] bg-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black brand-font text-black uppercase italic leading-none">Mi <span className="text-[#ff0095]">Canasta</span></h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-2">Sabores de Piura</p>
            </div>
            <button onClick={onToggle} className="w-12 h-12 rounded-2xl bg-[#fdf9c4]/30 flex items-center justify-center text-black hover:text-[#ff0095] transition-all">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-8 no-scrollbar space-y-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <i className="fa-solid fa-fish text-6xl text-[#fdf9c4] mb-6"></i>
              <p className="font-black text-gray-300 uppercase tracking-widest text-[10px]">Tu canasta está vacía, churre</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex p-1 bg-[#fdf9c4]/20 rounded-2xl">
                  <button onClick={() => setOrderType('delivery')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${orderType === 'delivery' ? 'bg-black text-white' : 'text-gray-400'}`}>Delivery</button>
                  <button onClick={() => setOrderType('pickup')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${orderType === 'pickup' ? 'bg-black text-white' : 'text-gray-400'}`}>Recojo</button>
                </div>
                <input type="text" placeholder="¿Tu nombre, churre?" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-6 py-4 rounded-2xl border-2 border-[#fdf9c4]/40 bg-white outline-none text-xs font-bold transition-all uppercase focus:border-[#ff0095]" />
                {orderType === 'delivery' && (
                  <textarea placeholder="Dirección para el envío..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-6 py-4 rounded-2xl border-2 border-[#fdf9c4]/40 bg-white outline-none text-xs font-bold h-24 resize-none transition-all uppercase focus:border-[#ff0095]" />
                )}
              </div>

              {/* Pago Yape con Acentos Rosa y Crema */}
              <div className={`space-y-6 transition-all duration-500 ${isFormValid ? 'opacity-100' : 'opacity-20 pointer-events-none translate-y-4'}`}>
                <div className="bg-[#fdf9c4] p-8 rounded-[2.5rem] border-2 border-[#ff0095]/10 shadow-xl text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff0095] block mb-6">Pagar con Yape</span>
                    
                    <div className="flex flex-col items-center mb-8">
                        <span className="text-[10px] font-bold text-black/40 uppercase mb-1">Total a Yapear</span>
                        <span className="text-5xl font-black brand-font tracking-tighter text-black uppercase italic">S/ {total.toFixed(2)}</span>
                    </div>

                    <button 
                      onClick={handleCopyYape}
                      className={`w-full py-5 rounded-2xl flex items-center justify-center gap-4 transition-all duration-500 font-black uppercase tracking-widest text-xs ${
                        hasCopiedYape ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-[#ff0095]'
                      }`}
                    >
                      {isCopying ? <i className="fa-solid fa-circle-notch animate-spin"></i> : hasCopiedYape ? <><i className="fa-solid fa-check"></i> ¡Copiado!</> : <><i className="fa-solid fa-copy"></i> Copiar: {APP_CONFIG.yapeNumber}</>}
                    </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-8 bg-white border-t-2 border-[#fdf9c4] space-y-4">
          <button 
            disabled={!canSubmit}
            onClick={handleWhatsAppOrder}
            className={`w-full py-6 rounded-2xl flex items-center justify-center gap-4 font-black text-sm transition-all shadow-xl ${canSubmit ? 'bg-[#ff0095] text-white hover:scale-105 active:scale-95' : 'bg-gray-100 text-gray-300'}`}
          >
            <i className="fa-brands fa-whatsapp text-xl"></i>
            <span className="uppercase tracking-[0.2em]">ENVIAR PEDIDO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
