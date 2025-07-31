import React from 'react';
import { useTranslation } from 'react-i18next';

interface PriceFilterProps {
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
}

export default function PriceFilter({ priceRange, onPriceChange }: PriceFilterProps) {
  const { t } = useTranslation();

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const min = Number(e.target.value);
    onPriceChange([min, priceRange[1]]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const max = Number(e.target.value);
    onPriceChange([priceRange[0], max]);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('filters.priceRange')}</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">{t('filters.min')}</label>
            <input
              type="number"
              value={priceRange[0]}
              onChange={handleMinChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">{t('filters.max')}</label>
            <input
              type="number"
              value={priceRange[1]}
              onChange={handleMaxChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="100"
            />
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {t('filters.showingProducts', { min: priceRange[0], max: priceRange[1] })}
        </div>
      </div>
    </div>
  );
}