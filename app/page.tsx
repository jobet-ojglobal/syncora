"use client";

import { useState } from 'react';
import { 
  ShoppingBag, Search, User, Menu, ArrowRight, ShieldCheck, 
  Truck, RotateCcw, Heart, Star, ChevronDown, X, SlidersHorizontal
} from 'lucide-react';
import Image from 'next/image';

// ==========================================
// 1. HARDCODED BRAND & PRODUCT DATA
// ==========================================
const NAVIGATION = ['New Releases', 'Men', 'Women', 'Collections', 'Ecosystem'];

const PRODUCTS = [
  {
    id: 'sync-01',
    name: 'Syncora Aura Pods Max',
    category: 'Audio',
    price: '$349',
    originalPrice: '$399',
    rating: 4.9,
    reviews: 128,
    tag: 'Best Seller',
    image: 'https://picsum.photos/seed/asd/200/300',
    colors: ['#000000', '#E5E7EB', '#3B82F6']
  },
  {
    id: 'sync-02',
    name: 'Aerodynamic Run Matrix',
    category: 'Footwear',
    price: '$180',
    tag: 'New Release',
    rating: 4.8,
    reviews: 64,
    image: 'https://picsum.photos/seed/ghhj/200/300',
    colors: ['#EF4444', '#111827']
  },
  {
    id: 'sync-03',
    name: 'Chrono-Titanium Shift OS',
    category: 'Wearables',
    price: '$549',
    rating: 5.0,
    reviews: 42,
    image: 'https://picsum.photos/seed/tyt/200/300',
    colors: ['#6B7280', '#000000']
  },
  {
    id: 'sync-04',
    name: 'Modular Tech Shell 01',
    category: 'Apparel',
    price: '$295',
    rating: 4.6,
    reviews: 89,
    image: 'https://picsum.photos/seed/eff/200/300',
    colors: ['#1F2937']
  }
];

const FEATURES = [
  { icon: Truck, title: 'Complementary Delivery', desc: 'Free express shipping globally.' },
  { icon: RotateCcw, title: '30-Day Evaluation', desc: 'Return or exchange hassle-free.' },
  { icon: ShieldCheck, title: 'Syncora Guarantee', desc: 'Two-year comprehensive warranty.' }
];

export default function SyncoraStorefront() {
  const [cartCount, setCartCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [likedProducts, setLikedProducts] = useState<string[]>([]);

  const toggleLike = (id: string) => {
    setLikedProducts(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans antialiased selection:bg-black selection:text-white">
      
      {/* --- TOP BRAND UTILITY BAR (Apple-Style) --- */}
      <div className="bg-[#111111] text-[#a1a1a6] text-[12px] py-2 px-6 flex justify-between items-center tracking-tight border-b border-neutral-900">
        <div>Introducing the Syncora Aura Series. Shipping worldwide.</div>
        <div className="hidden md:flex gap-4">
          <a href="#" className="hover:text-white transition-colors">Find a Store</a>
          <a href="#" className="hover:text-white transition-colors">Help</a>
        </div>
      </div>

      {/* --- MAIN HEADER NAVIGATION (Vercel & Shopify Blend) --- */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-8">
            <a href="#" className="text-lg font-bold tracking-tighter flex items-center gap-2">
              <div className="w-5 h-5 bg-black rounded-sm transform rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-sm"></div>
              </div>
              <span>SYNCORA</span>
            </a>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {NAVIGATION.map((item) => (
                <a 
                  key={item} 
                  href="#" 
                  className="text-[14px] font-medium text-neutral-600 hover:text-black transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          {/* User Utilities */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-neutral-600 hover:text-black transition-colors" aria-label="Search">
              <Search className="h-5 w-5 stroke-[1.5]" />
            </button>
            <button className="hidden sm:block p-2 text-neutral-600 hover:text-black transition-colors" aria-label="Account">
              <User className="h-5 w-5 stroke-[1.5]" />
            </button>
            <button 
              className="p-2 text-neutral-600 hover:text-black transition-colors relative flex items-center gap-1.5"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-scale-up">
                  {cartCount}
                </span>
              )}
            </button>
            <button className="md:hidden p-2 text-neutral-600 hover:text-black transition-colors">
              <Menu className="h-5 w-5 stroke-[1.5]" />
            </button>
          </div>

        </div>
      </header>

      {/* --- HERO VISION SECTION (Apple & Nike Bold Focus) --- */}
      <section className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40 mix-blend-luminosity">
          <Image 
            src="https://picsum.photos/seed/asht/200/300" 
            alt="Hero Background" 
              width={80}
                    height={1500}
            className="w-full h-full object-cover object-center scale-105 transform transition duration-1000"
          />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 md:pt-48 md:pb-36 flex flex-col items-center text-center">
          <span className="text-[12px] tracking-[0.2em] uppercase text-neutral-400 font-bold mb-3 block">
            Future of Utility
          </span>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter mb-6 max-w-3xl leading-[0.95]">
            ENGINEERED TO OUTPERFORM.
          </h2>
          <p className="text-base sm:text-xl text-neutral-300 max-w-xl font-normal leading-relaxed mb-10 tracking-tight">
            The next generation of synchronized gear. Zero friction, total intent, micro-tuned for high performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="bg-white text-black font-semibold text-[15px] px-8 py-3.5 rounded-full hover:bg-neutral-100 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5 group">
              Shop Now 
              <ArrowRight className="h-4 w-4 transform transition-transform group-hover:translate-x-1" />
            </button>
            <button className="border border-neutral-700 backdrop-blur-sm text-white font-semibold text-[15px] px-8 py-3.5 rounded-full hover:bg-white/10 transition-all">
              Explore Ecosystem
            </button>
          </div>
        </div>
      </section>

      {/* --- COLLECTION GRID FILTERS (Shopify / Vercel layout) --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-5 mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight">The Core Lineup</h3>
            <p className="text-sm text-neutral-500 mt-1">Showing all carefully calibrated components.</p>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
            {['All', 'Audio', 'Footwear', 'Wearables', 'Apparel'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[13px] font-medium px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                  activeCategory === cat 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* --- PRODUCT GRID (Shopify Mechanics + Nike Style Cards) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {PRODUCTS.filter(p => activeCategory === 'All' || p.category === activeCategory).map((product) => {
            const isLiked = likedProducts.includes(product.id);
            return (
              <div key={product.id} className="group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-neutral-100 hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300">
                
                {/* Image Showcase Box */}
                <div className="aspect-square bg-neutral-100 relative overflow-hidden">
                  <Image 
                    src={product.image} 
                    alt={product.name}
                    width={80}
                    height={1500}

                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Subtle Tags */}
                  {product.tag && (
                    <span className="absolute top-3 left-3 bg-white text-black text-[11px] font-bold px-2.5 py-1 rounded-full uppercase shadow-sm tracking-wider">
                      {product.tag}
                    </span>
                  )}
                  {/* Favorite Trigger */}
                  <button 
                    onClick={() => toggleLike(product.id)}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full text-neutral-400 hover:text-black shadow-sm transition-all transform md:opacity-0 group-hover:opacity-100"
                    aria-label="Add to favorites"
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>

                {/* Info Container */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[12px] text-neutral-400 font-medium mb-1">
                      <span>{product.category}</span>
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-neutral-600 font-semibold">{product.rating}</span>
                      </div>
                    </div>
                    <h4 className="text-[15px] font-bold text-neutral-900 tracking-tight group-hover:text-black">
                      {product.name}
                    </h4>

                    {/* Color Presets indicators */}
                    <div className="flex gap-1.5 mt-3">
                      {product.colors.map((hex, index) => (
                        <span 
                          key={index} 
                          className="w-3 h-3 rounded-full border border-neutral-300 block" 
                          style={{ backgroundColor: hex }} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-50 flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[16px] font-extrabold text-neutral-900">{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-neutral-400 line-through font-medium">{product.originalPrice}</span>
                      )}
                    </div>
                    
                    {/* Add to Cart Call-to-action */}
                    <button 
                      onClick={() => setCartCount(prev => prev + 1)}
                      className="text-[12px] font-bold bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-all active:scale-95"
                    >
                      Add To Bag
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </main>

      {/* --- PREMIUM BENEFITS BANNER (Shopify Architecture) --- */}
      <section className="bg-white border-t border-b border-neutral-200/60 my-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="flex gap-4 items-start">
                <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-900 shadow-sm shrink-0">
                  <Icon className="h-5 w-5 stroke-[1.5]" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-neutral-900">{feat.title}</h5>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- CLEAN OVERLAPPING APEX FOOTER (Apple & Vercel Blend) --- */}
      <footer className="bg-neutral-950 text-neutral-400 text-xs py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-3">
            <h6 className="text-white font-bold tracking-wider text-[11px] uppercase">Products</h6>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Aura Pods Series</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Run Matrix Shoes</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Shift wearables</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Latest Releases</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h6 className="text-white font-bold tracking-wider text-[11px] uppercase">Support Matrix</h6>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Order Architecture</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Shipping Frameworks</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Product Care & Tuning</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Returns Node</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h6 className="text-white font-bold tracking-wider text-[11px] uppercase">Corporate</h6>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Design Philosophies</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sustainability Log</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers Ecosystem</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Press Modules</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h6 className="text-white font-bold tracking-wider text-[11px] uppercase">Newsletter Sync</h6>
            <p className="leading-relaxed text-neutral-500">Subscribe for early access allocations, releases, and design journals.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter email address" 
                className="bg-neutral-900 border border-neutral-800 text-white text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-neutral-500" 
              />
              <button className="bg-white text-black font-semibold px-4 rounded-lg hover:bg-neutral-100 transition-all">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral-900 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-neutral-500">
          <div>© 2026 Syncora Inc. Minimalist ecosystems built for intent.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-neutral-300">Privacy Protocols</a>
            <a href="#" className="hover:text-neutral-300">Terms of Deployment</a>
            <a href="#" className="hover:text-neutral-300">Cookie Arrays</a>
          </div>
        </div>
      </footer>

    </div>
  );
}