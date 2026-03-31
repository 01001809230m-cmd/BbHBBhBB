import React from 'react';
import Icon, { paths } from './Icon';

const TopBar = ({ title, setIsMobileOpen }) => (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button className="md:hidden p-2 bg-white rounded-lg shadow" onClick={() => setIsMobileOpen?.(true)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800">{title}</h1>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="relative hidden md:block">
                <Icon path={paths.search} size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="بحث سريع..." className="pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-yellow-300 w-64 shadow-sm font-semibold" />
            </div>
            <div className="flex items-center gap-3">
                <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-gray-800 leading-none">أ. محمد زايد</span>
                    <span className="text-[10px] text-gray-500 mt-1 font-bold">مدير المنصة</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-yellow-300 flex items-center justify-center font-black text-blue-800">MZ</div>
            </div>
        </div>
    </div>
);

export default TopBar;
