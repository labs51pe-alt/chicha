
import React, { useState } from 'react';
import { CartItem } from '../types';
import { supabase } from '../lib/supabase';

interface CartProps {
  items: CartItem[];
  onRemove: (id: string, variantId?: string) => void;
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onClearCart: () => void;
  isOpen: boolean;
  onToggle: () => void;
  whatsappNumber: string;
}

type OrderType = 'delivery' | 'pickup';
type PaymentMethod = 'yape' | 'plin' | 'efectivo';

export const Cart: React.FC<CartProps> = ({
  items,
  onRemove,
  onUpdateQuantity,
  onClearCart,
  isOpen,
  onToggle,
  whatsappNumber
}) => {
  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yape');
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [hasCopiedPayment, setHasCopiedPayment] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const total = items.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.price;
    return sum + price * item.quantity;
  }, 0);

  const handleCopyPayment = (number: string) => {
    setIsCopying(true);
    navigator.clipboard.writeText(number);
    setTimeout(() => {
      setHasCopiedPayment(true);
      setIsCopying(false);
    }, 600);
  };

  const handleWhatsAppOrder = async () => {
    if ((paymentMethod !== 'efectivo' && !hasCopiedPayment) || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Guardar en Supabase
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_name: customerName,
          order_type: orderType,
          payment_method: paymentMethod,
          address: orderType === 'delivery' ? address : null,
          total_amount: total,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) {
        console.error("Detalle del error en orders:", orderError);
        throw new Error(orderError.message);
      }

      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_name: item.name,
        variant_name: item.selectedVariant?.name || null,
        quantity: item.quantity,
        price: item.selectedVariant ? item.selectedVariant.price : item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error("Detalle del error en items:", itemsError);
        throw new Error(itemsError.message);
      }

      // 2. Preparar mensaje de WhatsApp
      const typeLabel = orderType === 'delivery' ? '🛵 DELIVERY' : '🏠 RECOJO';
      const payLabel = paymentMethod.toUpperCase();
      const itemsText = items.map(item =>
          `• ${item.quantity}x ${item.name}${item.selectedVariant ? ` (${item.selectedVariant.name})` : ''}`
        ).join('\n');

      const message = encodeURIComponent(
        `¡Habla Chicha! 🌶️ Soy *${customerName || 'Cliente'}*\n` +
        `MODALIDAD: ${typeLabel}\n` +
        `PAGO: ${payLabel}\n` +
        `--------------------------------\n` +
        `📋 MI PEDIDO:\n` +
        `${itemsText}\n` +
        `--------------------------------\n` +
        `💰 TOTAL: S/ ${total.toFixed(2)}\n` +
        `--------------------------------\n` +
        `✅ ¡Pedido enviado desde la web!`
      );

      window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
      
      setOrderSuccess(true);
      onClearCart();
      setCustomerName('');
      setAddress('');
      setHasCopiedPayment(false);

    } catch (error: any) {
      console.error("Error completo del registro:", error);
      alert(`Error al registrar pedido: ${error.message || 'Verifica tu conexión y las tablas de Supabase'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOrderSuccess(false);
    onToggle();
  };

  const isFormValid =
    customerName.trim().length >= 2 &&
    (orderType === 'pickup' || (orderType === 'delivery' && address.trim().length >= 5));

  const needsCopy = paymentMethod !== 'efectivo';
  const canSubmit = isFormValid && (!needsCopy || hasCopiedPayment) && !isSubmitting;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-end bg-black/80 backdrop-blur-sm">
      <div className="bg-[#fffef5] w-full max-w-md h-full flex flex-col shadow-2xl border-l-4 border-[#fdf9c4] relative">
        
        {orderSuccess ? (
          <div className="flex-grow flex flex-col items-center justify-center p-12 text-center animate-reveal">
            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-4xl mb-8 shadow-2xl">
              <i className="fa-solid fa-check"></i>
            </div>
            <h2 className="brand-font text-4xl font-black italic uppercase mb-4">¡Pedido <span className="text-[#ff0095]">Listo!</span></h2>
            <p className="text-gray-400 text-sm font-bold uppercase mb-12">Ya enviamos tu pedido a WhatsApp.</p>
            <button onClick={handleClose} className="w-full bg-black text-white py-6 rounded-2xl font-black uppercase tracking-widest">Seguir pidiendo</button>
          </div>
        ) : (
          <>
            <div className="p-8 border-b-2 border-[#fdf9c4] bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black brand-font text-black uppercase italic">Mi <span className="text-[#ff0095]">Canasta</span></h2>
                </div>
                <button onClick={onToggle} className="w-12 h-12 rounded-2xl bg-[#fdf9c4]/30 flex items-center justify-center text-black">
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
                  <div className="space-y-6">
                    <div className="flex p-1 bg-[#fdf9c4]/20 rounded-2xl">
                      <button onClick={() => setOrderType('pickup')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${orderType === 'pickup' ? 'bg-black text-white' : 'text-gray-400'}`}>🏠 Recojo</button>
                      <button onClick={() => setOrderType('delivery')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${orderType === 'delivery' ? 'bg-black text-white' : 'text-gray-400'}`}>🛵 Delivery</button>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">¿Quién pide?</label>
                      <input type="text" placeholder="Tu nombre" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-6 py-4 rounded-2xl border-2 border-[#fdf9c4]/40 bg-white outline-none text-xs font-bold uppercase focus:border-[#ff0095]" />
                    </div>

                    {orderType === 'delivery' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Dirección</label>
                        <textarea placeholder="Calle y referencia..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-6 py-4 rounded-2xl border-2 border-[#fdf9c4]/40 bg-white outline-none text-xs font-bold h-20 resize-none uppercase focus:border-[#ff0095]" />
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Pago</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['yape', 'plin', 'efectivo'] as PaymentMethod[]).map(m => (
                          <button key={m} onClick={() => { setPaymentMethod(m); setHasCopiedPayment(false); }} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${paymentMethod === m ? 'border-black bg-black text-white' : 'border-[#fdf9c4] text-gray-400'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {needsCopy && isFormValid && (
                    <div className="bg-[#fdf9c4] p-8 rounded-[2.5rem] text-center shadow-xl animate-reveal">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#ff0095] block mb-4 italic">Paga con {paymentMethod.toUpperCase()}</span>
                        <span className="text-4xl font-black brand-font text-black italic block mb-6">S/ {total.toFixed(2)}</span>
                        <button onClick={() => handleCopyPayment('901885960')} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[10px] ${hasCopiedPayment ? 'bg-green-500 text-white' : 'bg-black text-white'}`}>
                          {isCopying ? <i className="fa-solid fa-circle-notch animate-spin"></i> : hasCopiedPayment ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-copy"></i>}
                          {hasCopiedPayment ? 'COPIADO' : 'COPIAR NÚMERO'}
                        </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-8 bg-white border-t-2 border-[#fdf9c4] space-y-4">
              <button disabled={!canSubmit} onClick={handleWhatsAppOrder} className={`w-full py-6 rounded-2xl flex items-center justify-center gap-4 font-black text-sm transition-all shadow-xl ${canSubmit ? 'bg-[#ff0095] text-white' : 'bg-gray-100 text-gray-300'}`}>
                {isSubmitting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-brands fa-whatsapp text-xl"></i>}
                <span className="uppercase tracking-widest">{isSubmitting ? 'PROCESANDO...' : 'CONFIRMAR PEDIDO'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
