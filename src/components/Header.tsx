import { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import OrnexLogo from '@/components/OrnexLogo';
type HeaderProps = { onSearch?: (query:string)=>void; appName?: string };
export default function Header({onSearch}:HeaderProps){return <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black px-4"><OrnexLogo size={23}/><label className="mx-3 flex min-w-0 flex-1 items-center rounded-full border border-white/20 bg-[#111] px-3 py-2"><Search className="h-4 w-4 shrink-0 text-white/60"/><input type="search" placeholder="Search" onChange={e=>onSearch?.(e.target.value)} className="ml-2 min-w-0 w-full bg-transparent text-sm text-white placeholder:text-white/50 outline-none"/></label><button aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center"><Bell className="h-5 w-5"/><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#D61E2B]"/></button></header>}
