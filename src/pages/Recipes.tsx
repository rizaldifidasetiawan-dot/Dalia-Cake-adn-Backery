import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Recipe, Ingredient } from '../types';
import { Plus, Search, ChefHat, Eye, Trash2, Filter, Scale, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/auth';

const Recipes: React.FC = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'recipes'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
      },
      (error) => {
        console.error("Recipes snapshot error:", error);
      }
    );
    return () => unsub();
  }, []);

  const categories = ['Semua', ...Array.from(new Set(recipes.map(r => r.category)))];

  const filtered = recipes.filter(r => 
    (categoryFilter === 'Semua' || r.category === categoryFilter) &&
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRecipeToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (recipeToDelete) {
      try {
        await deleteDoc(doc(db, 'recipes', recipeToDelete));
        setIsDeleteModalOpen(false);
        setRecipeToDelete(null);
      } catch (error) {
        console.error('Error deleting recipe:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Manajemen Resep</h1>
          <p className="text-gray-500">Daftar resep roti dan masakan Dalia Bakery</p>
        </div>
        {user?.role === 'admin' && (
          <Link
            to="/recipes/new"
            className="hidden md:flex items-center justify-center gap-2 bg-primary text-white py-3 px-6 rounded-full hover:bg-primary-dark transition-all shadow-md"
          >
            <Plus size={20} />
            Tambah Resep
          </Link>
        )}
      </header>

      {/* Mobile FAB */}
      {user?.role === 'admin' && (
        <Link
          to="/recipes/new"
          className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl z-40 active:scale-95 transition-transform"
        >
          <Plus size={28} />
        </Link>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari resep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-pink-50 shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-6 py-3 rounded-full font-medium whitespace-nowrap transition-all",
                categoryFilter === cat 
                  ? "bg-primary text-white shadow-md" 
                  : "bg-white text-gray-600 border border-pink-50 hover:bg-primary-light hover:text-primary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((recipe) => (
          <Link
            key={recipe.id}
            to={`/recipes/${recipe.id}`}
            className="group bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-primary-light text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                  {recipe.category}
                </span>
                {user?.role === 'admin' && (
                  <button 
                    onClick={(e) => handleDeleteClick(e, recipe.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2 group-hover:text-primary transition-colors">
                {recipe.name}
              </h3>
              <div className="flex items-center gap-4 text-gray-500 text-sm">
                <div className="flex items-center gap-1">
                  <ChefHat size={16} />
                  <span>{recipe.ingredients.length} Bahan</span>
                </div>
                <div className="flex items-center gap-1">
                  <Scale size={16} />
                  <span>Yield: {recipe.yield} {recipe.yieldUnit}</span>
                </div>
              </div>
            </div>
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                Lihat Detail
              </span>
              <Eye size={18} className="text-primary" />
            </div>
          </Link>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Hapus Resep?</h2>
              <p className="text-gray-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Recipes;
