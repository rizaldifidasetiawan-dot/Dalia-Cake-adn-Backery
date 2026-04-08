import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Logo from './Logo';
import { 
  LayoutDashboard, 
  ChefHat, 
  Scale, 
  ShoppingCart, 
  LogOut, 
  LogIn,
  Eye,
  EyeOff,
  Menu,
  X,
  Users,
  Shield,
  UtensilsCrossed,
  Calculator,
  Banknote
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, login, logout, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(username, password);
    if (!success) {
      setError('Username atau Password salah!');
    }
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Resep', path: '/recipes', icon: ChefHat },
    { name: 'Bahan Baku', path: '/ingredients', icon: Scale },
    { name: 'Buat Resep', path: '/make-recipe', icon: UtensilsCrossed },
    { name: 'Kalkulasi HPP', path: '/hpp', icon: Calculator },
    { name: 'Kasir', path: '/cashier', icon: Banknote },
    { name: 'Daftar Belanja', path: '/shopping-list', icon: ShoppingCart },
    { name: 'User Management', path: '/users', icon: Users },
    { name: 'Log Aktivitas', path: '/activity-logs', icon: Shield },
  ];

  let navItems = [];
  if (user?.role === 'admin') {
    navItems = allNavItems;
  } else if (user?.role === 'custom') {
    navItems = allNavItems.filter(item => user.allowedPages?.includes(item.path));
  } else if (user?.role === 'staff') {
    navItems = allNavItems.filter(item => item.path === '/make-recipe');
  } else if (user?.role === 'kasir') {
    navItems = allNavItems.filter(item => item.path === '/cashier');
  } else {
    navItems = allNavItems.filter(item => 
      ['/recipes', '/make-recipe', '/hpp', '/cashier', '/shopping-list'].includes(item.path)
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-paper"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary opacity-5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary opacity-5 rounded-full blur-[100px]"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full pro-card p-10 text-center relative z-10"
        >
          <div className="w-40 h-40 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white">
            <Logo size={100} className="text-primary" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-primary mb-1">Dalia Bakery</h1>
          <p className="text-stone-400 mb-10 font-medium text-sm uppercase tracking-[0.2em]">Management System</p>
          
          <form onSubmit={handleLogin} className="space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Username</label>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pro-input"
                placeholder="Masukkan username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pro-input pr-12"
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-primary transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg">{error}</p>}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 px-6 rounded-2xl hover:bg-primary-dark transition-all font-bold shadow-lg shadow-pink-200/50 mt-6"
            >
              <LogIn size={20} />
              Masuk ke Aplikasi
            </button>
          </form>
          <p className="mt-10 text-[10px] text-stone-300 uppercase tracking-widest">© 2026 Dalia Cake & Bakery</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-line p-8 sticky top-0 h-screen">
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="p-2 bg-primary-light rounded-2xl border border-line">
            <Logo size={50} className="text-primary" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-2xl text-primary leading-none">Dalia</h2>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Cake & Bakery</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-pink-200/50 translate-x-1" 
                    : "text-stone-500 hover:bg-stone-50 hover:text-primary"
                )}
              >
                <item.icon size={20} />
                <span className="font-semibold text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8 border-t border-line">
          <div className="flex items-center gap-4 px-2 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-primary-light flex items-center justify-center text-primary font-bold text-lg border border-line shadow-sm">
              {user.displayName[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-stone-800 truncate">{user.displayName}</p>
              <div className="flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest">
                <Shield size={10} />
                <span>{user.role}</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white border-b border-pink-100 p-5 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Logo size={48} className="text-primary" />
            <span className="font-serif font-bold text-xl text-primary">Dalia Bakery</span>
          </div>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-primary bg-primary-light rounded-xl"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-stone-400/20 backdrop-blur-sm" 
              onClick={() => setIsMenuOpen(false)}
            >
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="absolute right-0 top-0 bottom-0 w-72 bg-white p-8 shadow-2xl overflow-y-auto" 
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-10 px-2">
                  <Logo size={60} className="text-primary" />
                  <h2 className="font-serif font-bold text-2xl text-primary">Dalia</h2>
                </div>

                <div className="flex items-center gap-4 px-2 mb-8 pb-8 border-b border-pink-50">
                  <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-primary font-bold text-xl border-2 border-white shadow-sm">
                    {user.displayName[0]}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-800 truncate">{user.displayName}</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest">
                      <Shield size={10} />
                      <span>{user.role}</span>
                    </div>
                  </div>
                </div>

                <nav className="space-y-2 mb-10">
                  {navItems.map((item) => {
                    const isActive = item.path === '/' 
                      ? location.pathname === '/' 
                      : location.pathname.startsWith(item.path);
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all",
                          isActive 
                            ? "bg-primary text-white shadow-lg" 
                            : "text-gray-500 hover:bg-primary-light hover:text-primary"
                        )}
                      >
                        <item.icon size={22} />
                        <span className="font-bold">{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="pt-8 pb-12 border-t border-pink-50">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 hover:bg-red-50 font-bold"
                  >
                    <LogOut size={22} />
                    <span>Keluar</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-24 md:pb-10">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {navItems.slice(0, 5).map((item) => {
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all",
                  isActive 
                    ? "text-primary" 
                    : "text-gray-400"
                )}
              >
                <item.icon size={20} className={cn(isActive && "scale-110 transition-transform")} />
                <span className="text-[10px] font-bold">{item.name.split(' ')[0]}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                  />
                )}
              </Link>
            );
          })}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400"
          >
            <Menu size={20} />
            <span className="text-[10px] font-bold">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
