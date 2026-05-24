'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();

  // Menü elemanları ve Yollar
  const navItems = [
    { 
      name: 'Malzemeler', 
      path: '/malzeme-tipleri', 
      icon: <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Zm-17.7-9 8.7 5 8.7-5M12 22V12" /> 
    },
    { 
      name: 'İmalatlar', 
      path: '/gunluk-imalat', 
      icon: <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01M8 2h8v4H8z" /> 
    },
    { 
      name: 'Yedekleme', 
      path: '/yedekleme', 
      icon: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /> 
    },
    { 
      name: 'Demo', 
      path: '/demo', 
      icon: <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0M5.52 16h12.96" /> 
    }
  ];

  return (
    <header className="fixed top-4 right-4 z-[100] print:hidden">
      <nav className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-full border border-zinc-800 shadow-2xl">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <div key={item.name} className="relative group/nav">
              <Link 
                href={item.path}
                className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                    : 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
              </Link>
              
              {/* Tooltip (Fare ile üzerine gelince çıkan isim) */}
              <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-zinc-100 text-zinc-900 text-[11px] font-bold rounded opacity-0 group-hover/nav:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                {item.name}
              </span>
            </div>
          );
        })}
      </nav>
    </header>
  );
}