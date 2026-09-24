"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "../context/CartContext";

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const cart = useCart();

  useEffect(() => {
    const handleOpenCart = () => setIsOpen(true);
    document.addEventListener("open-cart", handleOpenCart);
    return () => document.removeEventListener("open-cart", handleOpenCart);
  }, []);

  const items = cart?.items || [];
  const checkoutUrl = cart?.checkoutUrl;
  const subtotal = cart?.subtotal?.amount
    ? `$${parseFloat(cart.subtotal.amount).toFixed(2)}`
    : "$0.00";

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          id="cart-drawer-overlay"
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        id="cart-drawer-panel"
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">Your Cart</h2>
            {items.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                {cart?.totalQuantity || items.length}
              </span>
            )}
          </div>
          <button
            id="cart-drawer-close-btn"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Items Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-neutral-500 space-y-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-2xl">
                🛒
              </div>
              <div>
                <p className="font-semibold text-neutral-800">Your cart is empty</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Ask our Voice Concierge to find parts or search the catalog!
                </p>
              </div>
              <Link
                href="/products"
                onClick={() => setIsOpen(false)}
                className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-black transition-colors"
              >
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-neutral-100">
              {items.map((item) => (
                <div key={item.id || item.variantId} className="pt-4 first:pt-0 flex gap-3">
                  {item.image?.url && (
                    <div className="relative w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden">
                      <Image
                        src={item.image.url}
                        alt={item.title}
                        fill
                        className="object-contain p-1"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {item.title}
                    </p>
                    {item.variantTitle && item.variantTitle !== "Default Title" && (
                      <p className="text-xs text-neutral-500 truncate">
                        {item.variantTitle}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-neutral-500">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-sm font-bold text-neutral-900">
                        ${parseFloat(item.price?.amount || "0").toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Checkout */}
        {items.length > 0 && (
          <div className="p-6 border-t border-neutral-200 bg-neutral-50/50 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-600 font-medium">Estimated Subtotal</span>
              <span className="text-base font-bold text-neutral-900">{subtotal}</span>
            </div>
            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition-colors"
              >
                Proceed to Checkout
              </a>
            ) : (
              <button
                onClick={() => {
                  if (cart?.checkout) cart.checkout();
                }}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition-colors"
              >
                Proceed to Checkout
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
