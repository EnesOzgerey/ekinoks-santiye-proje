'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();

  // Menü elemanları ve Yollar
  const navItems = [
    { 
      name: 'Malzeme Onayları', 
      path: '/malzeme-tipleri', 
      icon: <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Zm-17.7-9 8.7 5 8.7-5M12 22V12" /> 
    },
    { 
      name: 'İmalatlar', 
      path: '/gunluk-imalat', 
      icon: <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01M8 2h8v4H8z" /> 
    },
    { 
      name: 'Depo / Stok', 
      path: '/depo', 
      icon: (
        <>
          <rect width="20" height="5" x="2" y="3" rx="1" />
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
          <path d="M10 12h4" />
        </>
      ) 
    },
    { 
      name: 'İş Verileri', 
      path: '/is-verileri', 
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </>
      ) 
    },
    { 
        name: 'İmalat Planla', 
        path: '/imalat-planla', 
        icon: (
          <>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
            <path d="M16 18h.01" />
          </>
        ) 
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