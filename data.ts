
import { MenuItem, Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'todo', name: 'Todo', icon: 'fa-utensils' },
  { id: 'ceviches', name: 'Ceviches', icon: 'fa-fish' },
  { id: 'fondo', name: 'Platos de Fondo', icon: 'fa-plate-wheat' },
  { id: 'entradas', name: 'Entradas', icon: 'fa-bowl-food' },
  { id: 'bebidas', name: 'Bebidas', icon: 'fa-glass-water' }
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "1",
    name: "Ceviche de caballa",
    description: "Dicen en Piura que el ceviche de caballa no solo se come... se recuerda. Rica, potente y saladita.",
    price: 35.00,
    category: "ceviches",
    // FIX: Renamed 'image' to 'image_url' and 'isPopular' to 'is_popular' to match MenuItem interface
    image_url: "https://images.unsplash.com/photo-1534939561126-655b63aa5e07?q=80&w=1000&auto=format&fit=crop",
    is_popular: true,
    tags: ["Piurano", "Potente"]
  },
  {
    id: "2",
    name: "Ceviche de conchas negras",
    description: "Conchas negras frescas con limón recién exprimido, cebolla morada y ají potente. Acompañado de zarandaja y canchita.",
    price: 35.00,
    category: "ceviches",
    // FIX: Renamed 'image' to 'image_url'
    image_url: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=1000&auto=format&fit=crop",
    tags: ["Afrodisíaco"]
  },
  {
    id: "3",
    name: "Arroz con pato",
    description: "Plato tradicional del norte, lleno de sabor y color. Preparado con arroz verde, pato tierno, chicha de jora y especias.",
    price: 45.00,
    category: "fondo",
    // FIX: Renamed 'image' to 'image_url' and 'isPopular' to 'is_popular'
    image_url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?q=80&w=1000&auto=format&fit=crop",
    is_popular: true,
    tags: ["Tradicional"]
  },
  {
    id: "4",
    name: "Tamal verde",
    description: "Tradición envuelta en aroma y sabor. Suaves, perfumados con culantro y maíz tierno. Acompañados con jugo de seco y sarsa criolla.",
    price: 9.00,
    category: "entradas",
    // FIX: Renamed 'image' to 'image_url'
    image_url: "https://images.unsplash.com/photo-1599939308156-4293f9c3f4e2?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "5",
    name: "Carne aliñada con chifles",
    description: "Un festín de sabor: carne jugosa y perfectamente sazonada, combinada con la crocancia de los chifles y sarsa criolla.",
    price: 35.00,
    category: "fondo",
    // FIX: Renamed 'image' to 'image_url'
    image_url: "https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "6",
    name: "Clarito helado",
    description: "En Piura nace el sol, en Piura duerme el sol, de Piura el eterno calor. Refrescante chicha de jora filtrada.",
    price: 15.00,
    category: "bebidas",
    // FIX: Renamed 'image' to 'image_url'
    image_url: "https://images.unsplash.com/photo-1544145945-f904253d0c7b?q=80&w=1000&auto=format&fit=crop",
    tags: ["Fresco"]
  },
  {
    id: "7",
    name: "Ceviche de filete",
    description: "Fresco y lleno de sabor, con pescado tierno marinado en limón, acompañado de canchita, cebolla morada y zarandaja.",
    price: 30.00,
    category: "ceviches",
    // FIX: Renamed 'image' to 'image_url'
    image_url: "https://images.unsplash.com/photo-1534604973900-c41ab4c5e636?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "8",
    name: "Seco de cabrito con tamal verde",
    description: "Plato emblemático. Carne de cabrito suave y jugosa, en un aderezo de ajíes y hierbas locales, con tamal verde aromático.",
    price: 45.00,
    category: "fondo",
    // FIX: Renamed 'image' to 'image_url' and 'isPopular' to 'is_popular'
    image_url: "https://images.unsplash.com/photo-1544124499-58912cbddada?q=80&w=1000&auto=format&fit=crop",
    is_popular: true,
    tags: ["Norteño"]
  },
  {
    id: "9",
    name: "Ceviche mixto",
    description: "Lo mejor del mar: pescado fresco, langostinos y conchas negras, todo bañado en jugo de limón y ajícito tradicional.",
    price: 45.00,
    category: "ceviches",
    // FIX: Renamed 'image' to 'image_url'
    image_url: "https://images.unsplash.com/photo-1534422298391-e4f8c170db06?q=80&w=1000&auto=format&fit=crop",
    tags: ["El Rey"]
  }
];

export const APP_CONFIG = {
  whatsappNumber: "51901885960",
  yapeNumber: "901885960",
  yapeName: "Chicha Cevichería",
  socialMedia: {
    facebook: "https://facebook.com/chicha.cevicheriapiurana",
    instagram: "https://instagram.com/chicha.cevicheriapiurana",
    tiktok: "https://tiktok.com/@chicha.cevicheriapiurana"
  },
  images: {
    logo: "https://i.ibb.co/v4mYFvN/logo-chicha.png", // URL sugerida para el logo subido
    aiAvatar: "https://picsum.sh/seed/chicha-ai/100/100"
  }
};
