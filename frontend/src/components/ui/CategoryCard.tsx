import React from 'react';
import { Link } from 'react-router-dom';
import { Category } from '@/data/products';

interface CategoryCardProps {
  category: Category;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <Link
      to={`/products?category=${category.id}`}
      className="relative block overflow-hidden rounded-lg shadow-md group"
    >
      <div className="aspect-w-4 aspect-h-3">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white">{category.name}</h3>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;