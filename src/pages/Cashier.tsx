import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { Recipe } from '../types';
import { useAuth } from '../lib/auth';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  Banknote,
  X,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CartItem {
  recipeId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ReceiptSettings {
  storeName: string;
  address: string;
  phone: string;
  footer: string;
}

const Cashier: React.FC = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    storeName: 'DALIA BAKERY',
    address: 'Jl. Contoh No. 123, Kota',
    phone: '0812-3456-7890',
    footer: 'Terima Kasih, Selamat Menikmati!'
  });
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
    });

    const loadSettings = async () => {
      const docRef = doc(db, 'settings', 'receipt');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setReceiptSettings(docSnap.data() as ReceiptSettings);
      }
    };
    loadSettings();

    return () => unsub();
  }, []);

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'receipt'), receiptSettings);
      setIsSettingsModalOpen(false);
    } catch (error) {
      console.error("Error saving receipt settings:", error);
    }
  };

  const addToCart = (recipe: Recipe) => {
    const price = recipe.sellingPrice || 0;
    setCart(prev => {
      const existing = prev.find(item => item.recipeId === recipe.id);
      if (existing) {
        return prev.map(item => 
          item.recipeId === recipe.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { recipeId: recipe.id, name: recipe.name, price, quantity: 1 }];
    });
  };

  const updateQuantity = (recipeId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.recipeId === recipeId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (recipeId: string) => {
    setCart(prev => prev.filter(item => item.recipeId !== recipeId));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const change = paymentAmount > 0 ? paymentAmount - total : 0;

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Pembayaran - Dalia Bakery</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              padding: 10mm; 
              font-size: 12px;
              line-height: 1.4;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .mt-4 { margin-top: 15px; }
            .mb-2 { margin-bottom: 5px; }
            .no-print { display: none; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${isMobile ? '<div class="no-print text-center" style="padding: 10px; background: #f0f0f0; margin-bottom: 20px; font-family: sans-serif; border-radius: 8px;">Gunakan menu browser untuk "Simpan sebagai PDF" atau "Cetak"</div>' : ''}
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              ${isMobile ? '' : 'setTimeout(() => { window.close(); }, 500);'}
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const finishTransaction = () => {
    setCart([]);
    setCustomerName('');
    setPaymentAmount(0);
    setIsReceiptModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <Banknote size={32} />
            Kasir Dalia Bakery
          </h1>
          <p className="text-gray-500">Pilih produk dan cetak struk pembayaran.</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl border border-pink-100 text-primary font-bold hover:bg-primary-light transition-all shadow-sm"
          >
            <Settings size={20} />
            Pengaturan Struk
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Selection */}
        <div className={cn("lg:col-span-2 space-y-6", isCartOpen && "hidden lg:block")}>
          <section className="bg-white p-4 md:p-6 rounded-[32px] shadow-sm border border-pink-50">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => addToCart(recipe)}
                  className="bg-white p-4 md:p-5 rounded-[24px] border border-gray-100 hover:border-primary hover:shadow-md transition-all text-left group flex flex-col justify-between h-full"
                >
                  <div>
                    <span className="text-[8px] md:text-[10px] font-bold text-primary uppercase tracking-widest bg-primary-light px-2 py-0.5 rounded-full mb-2 inline-block">
                      {recipe.category}
                    </span>
                    <h3 className="font-bold text-sm md:text-base text-gray-800 mb-1 group-hover:text-primary transition-colors line-clamp-2">{recipe.name}</h3>
                  </div>
                  <div className="mt-2 md:mt-4 flex items-center justify-between">
                    <p className="font-mono font-bold text-xs md:text-sm text-gray-700">{formatCurrency(recipe.sellingPrice || 0)}</p>
                    <div className="p-1.5 md:p-2 bg-primary-light text-primary rounded-xl md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={16} />
                    </div>
                  </div>
                </button>
              ))}
              {filteredRecipes.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 italic">
                  Produk tidak ditemukan.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Shopping Cart */}
        <div className={cn("space-y-6", !isCartOpen && "hidden lg:block")}>
          <section className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-pink-50 flex flex-col h-[calc(100vh-200px)] lg:h-[calc(100vh-250px)] lg:sticky lg:top-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="text-primary" />
                Keranjang
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                  <ShoppingCart size={48} className="opacity-20 mb-4" />
                  <p>Keranjang masih kosong</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.recipeId} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs md:text-sm text-gray-800 truncate">{item.name}</p>
                      <p className="text-[10px] md:text-xs text-gray-500">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item.recipeId, -1)}
                        className="p-1 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold text-xs md:text-sm min-w-[16px] text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.recipeId, 1)}
                        className="p-1 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.recipeId)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Total</span>
                <span className="text-xl md:text-2xl font-mono font-bold text-primary">{formatCurrency(total)}</span>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => setIsReceiptModalOpen(true)}
                className="w-full bg-primary text-white py-3 md:py-4 rounded-2xl font-bold shadow-lg shadow-pink-100 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Bayar & Cetak
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile Cart FAB */}
      {!isCartOpen && cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="lg:hidden fixed bottom-24 right-6 bg-primary text-white p-4 rounded-full shadow-2xl z-40 flex items-center gap-2 animate-bounce"
        >
          <ShoppingCart size={24} />
          <span className="bg-white text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      )}

      {/* Receipt Modal */}
      <AnimatePresence>
        {isReceiptModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Payment Form */}
              <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-[80vh] md:max-h-none">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-primary">Pembayaran</h2>
                  <button onClick={() => setIsReceiptModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Pelanggan</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                      placeholder="Umum"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jumlah Bayar (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={paymentAmount === 0 ? '' : paymentAmount.toString()}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setPaymentAmount(val === '' ? 0 : parseInt(val));
                        }}
                        className="w-full pl-12 pr-4 py-3 md:py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none font-mono font-bold text-lg md:text-xl"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="p-5 md:p-6 bg-gray-50 rounded-[32px] space-y-2 md:space-y-3">
                    <div className="flex justify-between text-xs md:text-sm text-gray-500">
                      <span>Total Tagihan</span>
                      <span className="font-mono font-bold">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-gray-200">
                      <span className="font-bold text-sm md:text-base text-gray-800">Kembalian</span>
                      <span className={cn(
                        "text-xl md:text-2xl font-mono font-bold",
                        change >= 0 ? "text-green-600" : "text-red-500"
                      )}>
                        {formatCurrency(change)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 md:py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Printer size={18} />
                    Cetak Struk
                  </button>
                  <button
                    disabled={paymentAmount < total}
                    onClick={finishTransaction}
                    className="flex-1 bg-primary text-white py-3 md:py-4 rounded-2xl font-bold shadow-lg shadow-pink-100 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle2 size={18} />
                    Transaksi Selesai
                  </button>
                </div>

                {/* Mobile Receipt Preview (Visible in modal on mobile) */}
                <div className="md:hidden pt-6 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Preview Struk</p>
                  <div className="bg-gray-50 p-4 rounded-2xl overflow-x-auto">
                    <div 
                      className="bg-white p-6 shadow-sm font-mono text-[10px] text-gray-800 space-y-2 mx-auto w-[200px]"
                    >
                      <div className="text-center">
                        <p className="font-bold text-[12px]">{receiptSettings.storeName}</p>
                        <p className="text-[8px]">{receiptSettings.address}</p>
                      </div>
                      <div className="border-t border-dashed border-gray-300 my-2"></div>
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <div className="text-center mt-2">
                        <p className="text-[8px]">{receiptSettings.footer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Receipt Preview */}
              <div className="hidden md:block w-72 bg-gray-100 p-8 overflow-y-auto border-l border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Preview Struk</p>
                <div 
                  ref={receiptRef}
                  className="bg-white p-6 shadow-sm font-mono text-[10px] text-gray-800 space-y-2"
                >
                  <div className="text-center">
                    <p className="font-bold text-sm">{receiptSettings.storeName}</p>
                    <p>{receiptSettings.address}</p>
                    <p>Telp: {receiptSettings.phone}</p>
                  </div>
                  
                  <div className="divider border-t border-dashed border-gray-300 my-2"></div>
                  
                  <div className="flex justify-between">
                    <span>Tgl:</span>
                    <span>{new Date().toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>Admin</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cust:</span>
                    <span>{customerName || 'Umum'}</span>
                  </div>

                  <div className="divider border-t border-dashed border-gray-300 my-2"></div>

                  <div className="space-y-1">
                    {cart.map(item => (
                      <div key={item.recipeId}>
                        <p>{item.name}</p>
                        <div className="flex justify-between">
                          <span>{item.quantity} x {formatCurrency(item.price)}</span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="divider border-t border-dashed border-gray-300 my-2"></div>

                  <div className="flex justify-between font-bold">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BAYAR:</span>
                    <span>{formatCurrency(paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KEMBALI:</span>
                    <span>{formatCurrency(change)}</span>
                  </div>

                  <div className="divider border-t border-dashed border-gray-300 my-2"></div>

                  <div className="text-center mt-4">
                    <p>{receiptSettings.footer}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-primary">Pengaturan Struk</h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Toko</label>
                  <input
                    type="text"
                    value={receiptSettings.storeName}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, storeName: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Alamat</label>
                  <input
                    type="text"
                    value={receiptSettings.address}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, address: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">No. Telp</label>
                  <input
                    type="text"
                    value={receiptSettings.phone}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, phone: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Pesan Penutup (Footer)</label>
                  <textarea
                    value={receiptSettings.footer}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, footer: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all min-h-[100px]"
                  />
                </div>
              </div>

              <button
                onClick={saveSettings}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-pink-100 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                Simpan Pengaturan
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cashier;
