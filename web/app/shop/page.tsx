'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShoppingCart, Plus, Minus, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Product } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import clsx from 'clsx';

type CartItem = { product: Product; quantity: number };

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    api
      .getProducts()
      .then((res) => setProducts(res.products))
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.product.id !== productId);
    });
  }, []);

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price_cents * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleCheckout = async () => {
    if (!cart.length) return;
    setCheckoutLoading(true);
    try {
      const result = await api.createShopSession({
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lions-black pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <span className="text-lions-blue text-sm font-semibold tracking-widest uppercase font-montserrat">
              Fundraiser Shop
            </span>
            <h1 className="font-montserrat font-black text-3xl sm:text-4xl text-white mt-1">
              Support Our Mission
            </h1>
          </div>
          <button
            onClick={() => setCartOpen(!cartOpen)}
            className="relative p-3 bg-lions-mid border border-white/10 hover:border-lions-blue rounded-xl transition-colors"
          >
            <ShoppingCart size={22} className="text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-lions-blue rounded-full text-xs font-bold text-white flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="font-opensans text-red-300 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-lions-blue animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const inCart = cart.find((i) => i.product.id === product.id);
              return (
                <div
                  key={product.id}
                  className="bg-lions-mid border border-white/10 hover:border-lions-blue/40 rounded-2xl p-6 transition-all duration-200"
                >
                  <div className="text-5xl mb-4">{product.image_emoji || '📦'}</div>
                  <div className="inline-block px-2 py-0.5 bg-lions-blue/10 text-lions-blue text-xs font-semibold rounded-full mb-2 capitalize">
                    {product.category}
                  </div>
                  <h3 className="font-montserrat font-bold text-white text-lg mb-1">
                    {product.name}
                  </h3>
                  <p className="font-opensans text-lions-silver text-sm mb-4 leading-relaxed">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-montserrat font-black text-lions-blue text-xl">
                      ${(product.price_cents / 100).toFixed(2)}
                    </span>
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          <Minus size={14} className="text-white" />
                        </button>
                        <span className="font-montserrat font-bold text-white w-6 text-center">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(product)}
                          className="w-8 h-8 rounded-lg bg-lions-blue hover:bg-lions-blue-light flex items-center justify-center transition-colors"
                        >
                          <Plus size={14} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="px-4 py-2 bg-lions-blue hover:bg-lions-blue-light text-white font-montserrat font-semibold text-sm rounded-xl transition-colors"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cart Sidebar */}
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/60" onClick={() => setCartOpen(false)} />
            <div className="w-full max-w-sm bg-lions-dark border-l border-white/10 flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="font-montserrat font-bold text-white text-lg">
                  Cart ({cartCount})
                </h2>
                <button onClick={() => setCartOpen(false)} className="text-lions-silver hover:text-white">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <p className="font-opensans text-lions-silver text-sm text-center py-8">
                    Your cart is empty
                  </p>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <span className="text-2xl">{item.product.image_emoji || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-montserrat font-semibold text-white text-sm truncate">
                          {item.product.name}
                        </p>
                        <p className="font-opensans text-lions-silver text-xs">
                          ${(item.product.price_cents / 100).toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
                        >
                          <Minus size={12} className="text-white" />
                        </button>
                        <span className="font-bold text-white text-sm w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item.product)}
                          className="w-7 h-7 rounded-lg bg-lions-blue hover:bg-lions-blue-light flex items-center justify-center"
                        >
                          <Plus size={12} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-opensans text-lions-silver">Total</span>
                    <span className="font-montserrat font-black text-white text-xl">
                      ${(cartTotal / 100).toFixed(2)}
                    </span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    loading={checkoutLoading}
                    onClick={handleCheckout}
                  >
                    Checkout
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
