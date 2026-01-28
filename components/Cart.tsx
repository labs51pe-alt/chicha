
import React, { useState } from 'react';
import { CartItem, AppConfig } from '../types';
import { supabase } from '../lib/supabase';

interface CartProps {
  items: CartItem[];
  onRemove: (id: string, variantId?: string) => void;
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onClearCart: () => void;
  isOpen: boolean;
  onToggle: () => void;
  config: AppConfig;
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
  config
}) => {
  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yape');
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [hasCopiedPayment, setHasCopiedPayment] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const total = items.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.price;
    return sum + price * item.quantity;
  }, 0);

  const handleCopyPayment = (number: string) => {
    if (!number) return;
    setIsCopying(true);
    navigator.clipboard.writeText(number);
    setTimeout(() => {
      setHasCopiedPayment(true);
      setIsCopying(false);
    }, 600);
  };

  const handleWhatsAppOrder = async () => {
    if (isSubmitting) return;
    if (!customerName || !customerPhone || (orderType === 'delivery' && !address)) {
      alert("Por favor completa tus datos");
      return;
    }

    setIsSubmitting(true);
    try {
      const newOrder = {
        customer_name: customerName,
        customer_phone: customerPhone,
        order_type: orderType,
        payment_method: paymentMethod,
        address: orderType === 'delivery' ? address : 'Recojo en local',
        total_amount: total,
        status: 'pending',
        payment_status: 'pending'
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_name: item.name,
        variant_name: item.selectedVariant?.name || null,
        quantity: item.quantity,
        price: item.selectedVariant ? item.selectedVariant.price : item.price
      }));

      await supabase.from('order_items').insert(orderItems);

      const typeLabel = orderType === 'delivery' ? '🛵 DELIVERY' : '🏠 RECOJO';
      const payLabel = paymentMethod === 'efectivo' ? 'EFECTIVO' : `${paymentMethod.toUpperCase()} (Adjuntaré constancia)`;
      
      const itemsText = items.map(item =>
        `• ${item.quantity}x ${item.name}${item.selectedVariant ? ` (${item.selectedVariant.name})` : ''}`
      ).join('\n');

      const message = encodeURIComponent(
        `¡Habla Chicha! 🌶️\n` +
        `CLIENTE: *${customerName}*\n` +
        `TELÉFONO: ${customerPhone}\n` +
        `MODALIDAD: ${typeLabel}\n` +
        `PAGO: ${payLabel}\n` +
        `--------------------------------\n` +
        `📋 MI PEDIDO:\n` +
        `${itemsText}\n` +
        `--------------------------------\n` +
        `💰 TOTAL: S/ ${total.toFixed(2)}\n` +
        `📍 DIRECCIÓN: ${orderType === 'delivery' ? address : 'Para recojo'}\n` +
        `--------------------------------\n` +
        `✅ ¡Pedido enviado desde la web!`
      );

      window.open(`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}?text=${message}`, '_blank');
      
      setOrderSuccess(true);
      onClearCart();
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setHasCopiedPayment(false);

    } catch (error: any) {
      alert(`Error al procesar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = customerName.trim().length >= 2 && customerPhone.trim().length >= 8 && (orderType === 'pickup' || address.trim().length >= 2);
  const needsCopy = paymentMethod !== 'efectivo';
  const canSubmit = isFormValid && (!needsCopy || hasCopiedPayment) && !isSubmitting;

  if (!isOpen) return null;

  const paymentData = paymentMethod === 'yape' 
    ? { num: config.yape_number, name: config.yape_name } 
    : { num: config.plin_number, name: config.plin_name };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-end bg-black/80 backdrop-blur-sm">
      <div className="bg-[#fffef5] w-full max-w-md h-full flex flex-col shadow-2xl border-l-4 border-[#fdf9c4] relative animate-reveal">
        
        {orderSuccess ? (
          <div className="flex-grow flex flex-col items-center justify-center p-12 text-center animate-reveal">
            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-4xl mb-8 shadow-2xl">
              <i className="fa-solid fa-check"></i>
            </div>
            <h2 className="brand-font text-4xl font-black italic uppercase mb-4">¡Pedido <span className="text-[#ff0095]">Listo!</span></h2>
            <p className="text-gray-400 text-xs font-bold uppercase mb-12">Estamos esperando tu mensaje en WhatsApp para empezar a cocinar.</p>
            <button onClick={() => { setOrderSuccess(false); onToggle(); }} className="w-full bg-black text-white py-6 rounded-2xl font-black uppercase tracking-widest">Seguir pidiendo</button>
          </div>
        ) : (
          <>
            <div className="p-8 border-b-2 border-[#fdf9c4] bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black brand-font text-black uppercase italic">Mi <span className="text-[#ff0095]">Canasta</span></h2>
                <button onClick={onToggle} className="w-12 h-12 rounded-2xl bg-[#fdf9c4]/30 flex items-center justify-center text-black">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-8 no-scrollbar space-y-8">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-20">
                  <i className="fa-solid fa-fish text-6xl mb-6"></i>
                  <p className="font-black uppercase tracking-[0.5em] text-[10px]">Tu canasta está vacía</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex p-1 bg-[#fdf9c4]/20 rounded-2xl">
                    <button onClick={() => setOrderType('pickup')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${orderType === 'pickup' ? 'bg-black text-white' : 'text-gray-400'}`}>🏠 Recojo</button>
                    <button onClick={() => setOrderType('delivery')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${orderType === 'delivery' ? 'bg-black text-white' : 'text-gray-400'}`}>🛵 Delivery</button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">¿Quién pide?</label>
                        <input type="text" placeholder="Tu nombre" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-[#fdf9c4]/40 bg-white outline-none text-xs font-bold uppercase focus:border-black transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Celular / WhatsApp</label>
                        <input type="tel" placeholder="999 999 999" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-[#fdf9c4]/40 bg-white outline-none text-xs font-bold uppercase focus:border-black transition-all" />
                      </div>
                    </div>

                    {orderType === 'delivery' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Dirección de Entrega</label>
                        <textarea placeholder="Calle, número, oficina o referencia..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-6 py-4 rounded-2xl border-2 border-[#fdf9c4]/40 bg-white outline-none text-xs font-bold h-24 resize-none uppercase focus:border-black transition-all" />
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Método de Pago</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['yape', 'plin', 'efectivo'] as PaymentMethod[]).map(m => (
                          <button key={m} onClick={() => { setPaymentMethod(m); setHasCopiedPayment(false); }} className={`py-4 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${paymentMethod === m ? 'border-black bg-black text-white' : 'border-[#fdf9c4] text-gray-400'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {needsCopy && (
                    <div className="bg-[#fdf9c4] p-8 rounded-[2.5rem] text-center shadow-xl animate-reveal border-2 border-black/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#ff0095] block mb-2 italic">Paga con {paymentMethod.toUpperCase()}</span>
                        <span className="text-4xl font-black brand-font text-black italic block mb-2">S/ {total.toFixed(2)}</span>
                        
                        <div className="my-4 py-4 px-6 bg-white rounded-2xl border-2 border-black/10">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pagar al número:</p>
                          <p className="text-3xl font-black text-black tracking-widest mb-1">{paymentData.num || '901885960'}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase italic">A nombre de: {paymentData.name || 'Chicha'}</p>
                        </div>

                        <button onClick={() => handleCopyPayment(paymentData.num || '')} className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[10px] transition-all ${hasCopiedPayment ? 'bg-green-500 text-white shadow-lg' : 'bg-black text-white hover:scale-105'}`}>
                          {isCopying ? <i className="fa-solid fa-circle-notch animate-spin"></i> : hasCopiedPayment ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-copy"></i>}
                          {hasCopiedPayment ? 'NÚMERO COPIADO' : `COPIAR NÚMERO ${paymentMethod.toUpperCase()}`}
                        </button>
                        {!hasCopiedPayment && <p className="mt-4 text-[8px] font-black text-[#ff0095] uppercase animate-pulse italic">⚠️ Debes copiar el número para confirmar tu pedido</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-8 bg-white border-t-2 border-[#fdf9c4]">
              <div className="flex justify-between items-end mb-6">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total a pagar</span>
                <span className="text-3xl font-black brand-font italic">S/ {total.toFixed(2)}</span>
              </div>
              <button disabled={!canSubmit} onClick={handleWhatsAppOrder} className={`w-full py-6 rounded-2xl flex items-center justify-center gap-4 font-black text-sm transition-all shadow-xl ${canSubmit ? 'bg-[#ff0095] text-white hover:bg-black hover:scale-[1.02]' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                {isSubmitting ? <i className="fa-solid fa-circle-notch animate-spin text-xl"></i> : <i className="fa-brands fa-whatsapp text-2xl"></i>}
                <span className="uppercase tracking-widest">{isSubmitting ? 'REGISTRANDO...' : 'CONFIRMAR PEDIDO'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
