'use client';
import Link from 'next/link';
import { Calendar, ChevronDown, LogOut, Menu, Stethoscope, User, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { userAuthStore } from '@/store/authStore';

interface HeaderProps {
  showDashboardNav?: boolean;
}

interface NavigationItem {
  lable: string;
  icon: React.ComponentType<any>;
  href: string;
  active: boolean;
}

const Header: React.FC<HeaderProps> = ({ showDashboardNav = false }) => {
  const { user, isAuthenticated, logout } = userAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getDashboardNavigation = (): NavigationItem[] => {
    if (!user || !showDashboardNav) return [];
    if (user.type === 'patient') {
      return [{ lable: 'Appointments', icon: Calendar, href: '/patient/dashboard', active: pathname?.includes('/patient/dashboard') || false }];
    } else if (user.type === 'doctor') {
      return [
        { lable: 'Dashboard', icon: Calendar, href: '/doctor/dashboard', active: pathname?.includes('/doctor/dashboard') || false },
        { lable: 'Appointments', icon: Calendar, href: '/doctor/appointments', active: pathname?.includes('/doctor/appointments') || false },
      ];
    }
    return [];
  };

  const publicNavLinks = [
    { label: 'Find Doctors', href: '/doctor-list' },
    { label: 'Specialties', href: '/specialties' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'About', href: '/about' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,700&display=swap');
        .uc-font { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-brand { font-family: 'Fraunces', Georgia, serif; }

        .nav-pill::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0;
          width: 0; height: 1.5px;
          background: #0ea5e9;
          transition: width 0.25s ease;
          border-radius: 2px;
        }
        .nav-pill:hover::after { width: 100%; }

        @keyframes hdr-in {
          from { opacity: 0; transform: translateY(-14px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .hdr-animate { animation: hdr-in 0.55s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes mob-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .mob-animate { animation: mob-in 0.2s ease both; }

        @keyframes dot-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        .online-dot { animation: dot-pulse 2s ease-in-out infinite; }
      `}</style>

      <header className={`uc-font fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'pt-2 pb-2' : 'pt-4 pb-2'}`}>
        <div className='max-w-7xl mx-auto px-4 sm:px-6'>
          <div className={`hdr-animate relative flex items-center justify-between h-14 rounded-2xl px-4 sm:px-5 transition-all duration-500
            ${scrolled
              ? 'bg-white/96 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.10),0_1px_0_rgba(255,255,255,0.8)_inset] border border-slate-200/70'
              : 'bg-white/75 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] border border-white/80'
            }`}>

            {/* ─── Logo ─────────────────────────────────── */}
            <Link href='/' className='flex items-center gap-2.5 group flex-shrink-0 z-10'>
              <div className='relative'>
                <div className='w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-[10px] flex items-center justify-center shadow-lg shadow-sky-300/40 group-hover:scale-105 group-hover:-rotate-3 transition-all duration-300'>
                  <Stethoscope className='w-[17px] h-[17px] text-white' />
                </div>
                <span className='online-dot absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-[2px] border-white shadow-sm' />
              </div>
              <span className='uc-brand text-[18px] font-bold text-slate-900 tracking-tight leading-none'>
                Uni<span className='text-sky-500'>Care</span>
                <sup className='text-slate-300 font-light text-[11px] tracking-normal'>+</sup>
              </span>
            </Link>

            {/* ─── Center Nav ───────────────────────────── */}
            {!isAuthenticated && !showDashboardNav && (
              <nav className='hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2'>
                {publicNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className='nav-pill relative text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200 py-1'
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            {isAuthenticated && showDashboardNav && (
              <nav className='hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2'>
                {getDashboardNavigation().map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      item.active ? 'bg-sky-50 text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                    }`}
                  >
                    <item.icon className='w-3.5 h-3.5' />
                    {item.lable}
                  </Link>
                ))}
              </nav>
            )}

            {/* ─── Right Side ───────────────────────────── */}
            <div className='flex items-center gap-2 flex-shrink-0 z-10'>
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className='flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-50 transition-colors duration-200 group border border-transparent hover:border-slate-200'>
                      <Avatar className='w-7 h-7 ring-2 ring-sky-100 ring-offset-1'>
                        <AvatarImage src={user?.profileImage} alt={user?.name} />
                        <AvatarFallback className='bg-gradient-to-br from-sky-400 to-sky-600 text-white text-xs font-bold'>
                          {user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className='hidden md:block text-left'>
                        <p className='text-[13px] font-semibold text-slate-800 leading-none'>{user?.name}</p>
                        <p className='text-[11px] text-slate-400 capitalize mt-0.5'>{user?.type}</p>
                      </div>
                      <ChevronDown className='w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 group-data-[state=open]:rotate-180 hidden md:block' />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-56 rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/60 p-1.5 mt-2 bg-white'>
                    <DropdownMenuLabel className='px-3 py-2.5'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='w-10 h-10 ring-2 ring-sky-50'>
                          <AvatarImage src={user?.profileImage} alt={user?.name} />
                          <AvatarFallback className='bg-gradient-to-br from-sky-400 to-sky-600 text-white font-bold'>
                            {user?.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0'>
                          <p className='text-sm font-semibold text-slate-900 truncate'>{user?.name}</p>
                          <p className='text-xs text-slate-400 truncate'>{user?.email}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className='bg-slate-100 my-1' />
                    <DropdownMenuItem asChild>
                      <Link href={`/${user?.type}/profile`} className='flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors'>
                        <div className='w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center'>
                          <User className='w-3.5 h-3.5 text-slate-500' />
                        </div>
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className='bg-slate-100 my-1' />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className='flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 focus:bg-red-50 transition-colors'
                    >
                      <div className='w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center'>
                        <LogOut className='w-3.5 h-3.5 text-red-400' />
                      </div>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href='/login/patient' className='hidden md:block'>
                    <button className='text-[13px] font-medium text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-50/80 transition-all duration-200'>
                      Sign in
                    </button>
                  </Link>
                  <Link href='/signup/patient' className='hidden md:block'>
                    <button className='text-[13px] font-semibold bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white px-4 py-2 rounded-xl shadow-md shadow-sky-300/40 hover:shadow-sky-400/50 transition-all duration-200 hover:-translate-y-px active:translate-y-0'>
                      Book Consultation
                    </button>
                  </Link>
                  <button
                    className='md:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-200'
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label='Toggle menu'
                  >
                    {mobileOpen
                      ? <X className='w-4 h-4 text-slate-700' />
                      : <Menu className='w-4 h-4 text-slate-700' />
                    }
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ─── Mobile Menu ─────────────────────────── */}
          {mobileOpen && (
            <div className='mob-animate md:hidden mt-2 bg-white/97 backdrop-blur-2xl rounded-2xl border border-slate-100 shadow-2xl overflow-hidden'>
              <div className='p-3 space-y-0.5'>
                {publicNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className='flex items-center px-4 py-3 text-sm font-medium text-slate-700 hover:text-sky-600 hover:bg-sky-50/70 rounded-xl transition-all duration-200'
                  >
                    {link.label}
                  </Link>
                ))}
                <div className='pt-3 mt-1 border-t border-slate-100 flex flex-col gap-2 pb-1'>
                  <Link href='/login/patient' onClick={() => setMobileOpen(false)}>
                    <button className='w-full text-sm font-medium text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200'>
                      Sign in
                    </button>
                  </Link>
                  <Link href='/signup/patient' onClick={() => setMobileOpen(false)}>
                    <button className='w-full text-sm font-semibold bg-gradient-to-b from-sky-500 to-sky-600 text-white px-4 py-2.5 rounded-xl shadow-md shadow-sky-200/50 hover:from-sky-400 hover:to-sky-500 transition-all duration-200'>
                      Book Consultation
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;