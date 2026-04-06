import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { AppUser } from '../types';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { Plus, Trash2, Edit2, UserPlus, Shield, Key, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'staff' as 'admin' | 'staff' | 'kasir'
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'), 
      (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
      },
      (error) => {
        console.error("Users snapshot error:", error);
      }
    );
    return () => unsub();
  }, []);

  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Akses Ditolak. Hanya Admin yang dapat mengakses halaman ini.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          ...formData
        });
      } else {
        await addDoc(collection(db, 'users'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', displayName: '', role: 'staff' });
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleDeleteClick = (id: string) => {
    const target = users.find(u => u.id === id);
    if (target?.username === 'Dalia') {
      setDeleteError('Admin Utama tidak dapat dihapus!');
      setTimeout(() => setDeleteError(null), 3000);
      return;
    }
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        await deleteDoc(doc(db, 'users', userToDelete));
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Manajemen User</h1>
          <p className="text-gray-500">Kelola akses staff dan admin</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ username: '', password: '', displayName: '', role: 'staff' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white py-3 px-6 rounded-full hover:bg-primary-dark transition-all shadow-md"
        >
          <UserPlus size={20} />
          Tambah User
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <motion.div
            layout
            key={u.id}
            className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-2xl",
                  u.role === 'admin' ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
                )}>
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{u.displayName}</h3>
                  <p className="text-sm text-gray-500">@{u.username}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingUser(u);
                    setFormData({ username: u.username, password: u.password, displayName: u.displayName, role: u.role });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  <Edit2 size={16} />
                </button>
                {u.username !== 'Dalia' && (
                  <button 
                    onClick={() => handleDeleteClick(u.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            {deleteError && userToDelete === u.id && (
              <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg text-center animate-pulse">
                {deleteError}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              <Key size={12} />
              <span>Password: {u.password}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-primary-light">
                <h2 className="text-xl font-bold text-primary">
                  {editingUser ? 'Edit User' : 'Tambah User Baru'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Nama Lengkap</label>
                  <input
                    required
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Username</label>
                  <input
                    required
                    type="text"
                    disabled={editingUser?.username === 'Dalia'}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Password</label>
                  <input
                    required
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Role</label>
                  <select
                    disabled={editingUser?.username === 'Dalia'}
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none bg-white disabled:bg-gray-50"
                  >
                    <option value="staff">Staff</option>
                    <option value="kasir">Kasir</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg"
                >
                  <Save size={20} />
                  Simpan User
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <h2 className="text-xl font-bold text-gray-800 mb-2">Hapus User?</h2>
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

export default UserManagement;
