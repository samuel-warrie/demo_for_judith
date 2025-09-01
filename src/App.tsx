import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { useWebSocketProducts } from './hooks/useWebSocketProducts';
import { useAuth } from './context/AuthContext';
import { useSubscription } from './hooks/useSubscription';
import LoginForm from './components/LoginForm';
import Header from './components/Header';
import CategoryFilter from './components/CategoryFilter';
import PriceFilter from './components/PriceFilter';
import SortFilter from './components/SortFilter';
import ProductGrid from './components/ProductGrid';
import SuccessPage from './pages/SuccessPage';
import BookingPage from './pages/BookingPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import ProductDetailPage from './pages/ProductDetailPage';
import { Product } from './types';

function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { planName, isActive } = useSubscription();
  const { products, loading, error, connected, getProductsByCategory, refreshProducts } = useWebSocketProducts();
  const [showBookingModal, setShowBookingModal] = useState(false);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to load products</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={refreshProducts}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show connection status for debugging
  console.log('WebSocket connected:', connected);
  console.log('Products loaded:', products.length);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = getProductsByCategory(selectedCategory).filter((product: Product) => {
      // Price filter
      if (product.price < priceRange[0] || product.price > priceRange[1]) {
        return false;
      }
      
      // Search filter
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });

    // Sort products
    filtered.sort((a: Product, b: Product) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return b.id - a.id;
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, selectedCategory, priceRange, sortBy, searchQuery, getProductsByCategory]);

  // Calculate categories with counts
  const categories = useMemo(() => [
    { id: 'all', name: 'All Products', count: products.length },
    { id: 'skincare', name: 'Skincare', count: products.filter(p => p.category === 'skincare').length },
    { id: 'makeup', name: 'Makeup', count: products.filter(p => p.category === 'makeup').length }
  ], [products]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onSearchChange={setSearchQuery} />
      
      {/* User Subscription Status */}
      
      {/* Hero Section */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {t('hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              {t('hero.subtitle')}
            </p>
            <div className="flex justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>{t('hero.features.freeShipping')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>{t('hero.features.returns')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>{t('hero.features.expertApproved')}</span>
              </div>
            </div>
            
            {/* Book Appointment Button */}
            <div className="mt-8">
              <button
                onClick={() => setShowBookingModal(true)}
                className="bg-white text-black px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                {t('hero.bookAppointment')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 space-y-6">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
            <PriceFilter
              priceRange={priceRange}
              onPriceChange={setPriceRange}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCategory === 'all' ? t('categories.allProducts') : 
                   selectedCategory === 'skincare' ? t('categories.skincare') : 
                   selectedCategory === 'makeup' ? t('categories.makeup') : 
                   selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                </h2>
                <p className="text-gray-600 mt-1">
                  {t('products.productsFound', { count: filteredAndSortedProducts.length })}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{t('filters.sortBy')}</span>
                <SortFilter sortBy={sortBy} onSortChange={setSortBy} />
              </div>
            </div>

            {/* Products Grid */}
            <ProductGrid products={filteredAndSortedProducts} loading={loading} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-black mb-4">
              {t('footer.title')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('footer.description')}
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500">
              <span>{t('footer.copyright')}</span>
              <span>•</span>
              <span>{t('footer.builtFor')}</span>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal onClose={() => setShowBookingModal(false)} />
      )}
    </div>
  );
}

function AppContent() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/booking-success" element={<BookingSuccessPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
      </Routes>
      {showLogin && <LoginForm onClose={() => setShowLogin(false)} />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;