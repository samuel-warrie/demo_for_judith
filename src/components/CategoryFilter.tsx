import React from 'react';
import { categories } from '../data/products';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-gray-100 text-black font-medium border border-gray-300'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{category.name}</span>
              <span className={`text-sm ${
                selectedCategory === category.id ? 'text-black' : 'text-gray-400'
              }`}>
                {category.count}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}