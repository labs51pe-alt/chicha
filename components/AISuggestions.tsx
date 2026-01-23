
import React, { useState } from 'react';
import { getAIRecommendation } from '../services/geminiService';
import { MenuItem } from '../types';

interface AISuggestionsProps {
  menu: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
}

export const AISuggestions: React.FC<AISuggestionsProps> = ({ menu, onSelectItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ message: string; recommendedItemIds: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    const result = await getAIRecommendation(prompt, menu);
    setResponse(result);
    setLoading(false);
    setPrompt('');
  };

  const quickPrompts = [
    "Algo con harto pollo",
    "Tengo hambre y poco money",
    "La hamburguesa más power"
  ];

  return (
    <div className="fixed bottom-24 left-6 md:left-12 z-[100]">
      {isOpen ? (
        <div className="bg-white w-[90vw] sm:w-[380px] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-[#e91e63]/10 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="hero-gradient p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#e91e63] shadow-lg">
                <i className="fa-solid fa-robot text-2xl"></i>
              </div>
              <div>
                <div className="flex items-center gap-1.5 opacity-80">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <p className="text-[10px] font-bold uppercase tracking-widest">En línea</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="p-6 max-h-[450px] overflow-y-auto no-scrollbar space-y-6 bg-gray-50/50">
            {response ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative">
                   <div className="bg-white p-5 rounded-[1.5rem] rounded-tl-none shadow-sm text-sm italic text-gray-700 leading-relaxed border border-gray-100">
                    "{response.message}"
                   </div>
                   <div className="absolute top-0 -left-2 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-100"></div>
                </div>

                {response.recommendedItemIds.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {response.recommendedItemIds.map(id => {
                      const item = menu.find(m => m.id === id);
                      if (!item) return null;
                      return (
                        <button 
                          key={id}
                          onClick={() => onSelectItem(item)}
                          className="flex flex-col gap-2 p-3 bg-white border border-gray-100 rounded-2xl hover:border-[#e91e63] transition-all text-left shadow-sm group"
                        >
                          <div className="relative overflow-hidden rounded-xl h-24">
                            {/* FIX: Changed 'item.image' to 'item.image_url' to match MenuItem interface */}
                            <img src={item.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          </div>
                          <span className="text-[11px] font-black line-clamp-1 brand-font uppercase">{item.name}</span>
                          <span className="text-[11px] font-bold text-[#e91e63]">S/ {item.price.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                <button 
                  onClick={() => setResponse(null)}
                  className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-[#e91e63] bg-[#e91e63]/5 rounded-xl hover:bg-[#e91e63]/10 transition-colors"
                >
                  Hacer otra pregunta
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {!loading && (
                  <>
                    <div className="bg-white p-5 rounded-[1.5rem] rounded-tl-none shadow-sm text-sm text-gray-600 border border-gray-100">
                       ¡Habla churre! ¿No sabes qué pedir? Cuéntame qué se te antoja o cuánto money tienes y yo te ayudo.
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Sugerencias:</p>
                      <div className="flex flex-wrap gap-2">
                        {quickPrompts.map(qp => (
                          <button 
                            key={qp}
                            onClick={() => {setPrompt(qp);}}
                            className="bg-white border border-gray-100 px-4 py-2 rounded-full text-xs font-bold text-gray-500 hover:border-[#e91e63] hover:text-[#e91e63] transition-all shadow-sm"
                          >
                            {qp}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 bg-[#e91e63] rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-[#e91e63] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-3 h-3 bg-[#e91e63] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#e91e63] animate-pulse">Pensando algo bacán...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 border-t bg-white flex gap-3">
            <input 
              type="text" 
              placeholder="Escribe aquí, churre..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="flex-grow bg-gray-50 px-5 py-3 rounded-2xl text-sm border-transparent border focus:border-[#e91e63]/20 focus:bg-white outline-none transition-all"
            />
            <button 
              disabled={loading || !prompt.trim()}
              className="bg-[#e91e63] text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-[#c2185b] transition-all shadow-lg shadow-[#e91e63]/20 disabled:opacity-50 disabled:shadow-none"
            >
              <i className="fa-solid fa-paper-plane text-sm"></i>
            </button>
          </form>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-[#e91e63] text-white rounded-3xl flex items-center justify-center shadow-2xl animate-float hover:scale-110 transition-transform active:scale-95 group relative rotate-3 hover:rotate-0"
        >
          <i className="fa-solid fa-robot text-3xl"></i>
          <span className="absolute -top-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white"></span>
          <div className="absolute left-full ml-6 bg-white text-gray-900 px-6 py-3 rounded-2xl shadow-2xl text-xs font-black brand-font uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 pointer-events-none border border-gray-100">
            ¿Qué vas a pedir, churre? 🍔
          </div>
        </button>
      )}
    </div>
  );
};
