import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SortFilterProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export default function SortFilter({ sortBy, onSortChange }: SortFilterProps) {
  const { t } = useTranslation();

  const sortOptions = [
    { value: 'featured', label: t('filters.sortOptions.featured') },
    { value: 'price-low', label: t('filters.sortOptions.priceLow') },
    { value: 'price-high', label: t('filters.sortOptions.priceHigh') },
    { value: 'rating', label: t('filters.sortOptions.rating') },
    { value: 'newest', label: t('filters.sortOptions.newest') }
  ];

  return (
    <div className="relative">
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}