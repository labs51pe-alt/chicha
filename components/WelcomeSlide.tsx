
import React, { useState, useEffect } from 'react';

interface WelcomeSlideProps {
  onEnter: () => void;
  customLogo?: string;
  customSlides: string[];
  socials?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  onLogoClick?: () => void;
}

export const WelcomeSlide: React.FC<WelcomeSlideProps> = ({ onEnter, customLogo, customSlides, socials, onLogoClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const slides = customSlides && customSlides.length > 0 ? customSlides : [
    "https://images.unsplash.com/photo-1534604973900-c41ab4c5e636?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=1600&auto=format&fit=crop"
  ];

  useEffect(() => {
    setIsVisible(true);
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="fixed inset-0 z-[500] bg-white overflow-hidden flex flex-col items-center justify-center">
      
      {/* Fondo de Diapositivas */}
      <div className="absolute inset-0 z-0 bg-black">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`absolute inset-0 transition-opacity duration-[2500ms] ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img 
              src={slide} 
              className={`w-full h-full object-cover transition-transform duration-[8000ms] ease-linear brightness-[0.7] ${
                index === currentSlide ? 'scale-110' : 'scale-100'
              }`} 
              alt="Chicha Experience" 
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Contenido Central */}
      <div className="relative z-20 flex flex-col items-center px-4 w-full text-center">
        
        {/* Caja del Logo usando el color crema exacto del logo */}
        <div className={`bg-[#fdf9c4] py-12 px-8 md:px-16 rounded-[3rem] transition-all duration-1000 transform max-w-[340px] md:max-w-md lg:max-w-lg ${
          isVisible 
            ? 'scale-100 opacity-100 shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)]' 
            : 'scale-95 opacity-0'
        }`}>
          
          <div className="flex flex-col items-center mb-8 cursor-pointer" onClick={onLogoClick}>
            {customLogo ? (
              <img src={customLogo} className="h-44 md:h-64 object-contain filter brightness-0" alt="Chicha Logo" />
            ) : (
              <>
                <h1 className="script-font text-black text-[9rem] md:text-[13rem] leading-[0.6] select-none transform -rotate-2">
                  Chicha
                </h1>
                <h2 className="text-[#ff0095] font-black text-sm md:text-xl tracking-[0.3em] uppercase mt-4">
                  Cevichería Piurana
                </h2>
              </>
            )}
          </div>

          <p className="text-black/80 font-bold text-xs md:text-sm mb-10 tracking-tight italic max-w-[280px] mx-auto border-t border-black/5 pt-6">
            "El sabor del norte que conquistó la capital."
          </p>

          <button 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onEnter, 600);
            }}
            className="w-full bg-[#ff0095] text-white py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            ENTRAR A LA CARTA
            <i className="fa-solid fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
          </button>
        </div>

        <div className={`mt-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-white font-black text-[10px] uppercase tracking-[1em] opacity-60">
            Mercado 2 • Surquillo
          </p>
        </div>
      </div>

      {/* Social Links */}
      <div className={`absolute bottom-10 left-0 right-0 flex justify-center gap-8 md:gap-12 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        {socials?.whatsapp && (
          <a href={`https://wa.me/${socials.whatsapp.replace(/\D/g, '')}`} target="_blank" className="text-white/40 hover:text-[#ff0095] transition-all transform hover:scale-125">
            <i className="fa-brands fa-whatsapp text-2xl"></i>
          </a>
        )}
        {socials?.instagram && (
          <a href={socials.instagram} target="_blank" className="text-white/40 hover:text-[#ff0095] transition-all transform hover:scale-125">
            <i className="fa-brands fa-instagram text-2xl"></i>
          </a>
        )}
        {socials?.facebook && (
          <a href={socials.facebook} target="_blank" className="text-white/40 hover:text-[#ff0095] transition-all transform hover:scale-125">
            <i className="fa-brands fa-facebook text-2xl"></i>
          </a>
        )}
        {socials?.tiktok && (
          <a href={socials.tiktok} target="_blank" className="text-white/40 hover:text-[#ff0095] transition-all transform hover:scale-125">
            <i className="fa-brands fa-tiktok text-2xl"></i>
          </a>
        )}
      </div>
    </div>
  );
};
