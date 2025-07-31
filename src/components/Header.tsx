import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, Menu, X, Calendar, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Cart from './Cart';
import LanguageSwitcher from './LanguageSwitcher';
import LoginForm from './LoginForm';

interface HeaderProps {
  onSearchChange: (query: string) => void;
}

export default function Header({ onSearchChange }: HeaderProps) {
  const { t } = useTranslation();
  const { totalItems } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearchChange(query);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-black">
                {t('site.title')}
              </Link>
              <nav className="hidden md:flex items-center space-x-8 ml-8">
                <Link 
                  to="/" 
                  className="text-gray-600 hover:text-black transition-colors"
                >
                  {t('navigation.shop')}
                </Link>
                <Link 
                  to="/book" 
                  className="text-gray-600 hover:text-black transition-colors"
                >
                  {t('navigation.bookAppointment')}
                </Link>
              </nav>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={t('search.placeholder')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 text-gray-600 hover:text-black transition-colors"
                  >
                    <User className="w-5 h-5" />
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] z-50">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            navigate('/admin');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Admin Dashboard</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-black transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Sign In</span>
                </button>
              )}
              
              <button className="p-2 text-gray-600 hover:text-pink-600 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-black transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="space-y-4">
                {/* Mobile Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={t('search.placeholder')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                {/* Mobile Actions */}
                <div className="flex items-center justify-around pt-2">
                  <Link 
                    to="/book"
                    className="flex flex-col items-center space-y-1 text-gray-600"
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="text-xs">{t('navigation.bookAppointment')}</span>
                  </Link>
                  <button className="flex flex-col items-center space-y-1 text-gray-600">
                    <Heart className="w-5 h-5" />
                    <span className="text-xs">{t('navigation.wishlist')}</span>
                  </button>
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="flex flex-col items-center space-y-1 text-gray-600 relative"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span className="text-xs">{t('navigation.cart')}</span>
                    {totalItems > 0 && (
                      <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      {showLogin && <LoginForm onClose={() => setShowLogin(false)} />}
    </>
  );
}