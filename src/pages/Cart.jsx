import { API_URL } from "../config/api";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import axios from "axios";
import { useCart } from "../context/CartContext";

function Cart() {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    syncCartProducts,
    cartCount,
    cartTotal,
  } = useCart();
    const [refreshing, setRefreshing] = useState(false);
    const [cartNotice, setCartNotice] = useState("");

    useEffect(() => {
    if (cartItems.length === 0) return;

    const refreshProducts = async () => {
        setRefreshing(true);

        try {
        const results = await Promise.allSettled(
        cartItems.map((item) =>
            axios.get(`${API_URL}/api/products/${item._id}`)
        )
        );

        const latestProducts = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value.data.product);

        const deletedProductIds = results
        .map((result, index) => {
            if (
            result.status === "rejected" &&
            result.reason.response?.status === 404
            ) {
            return cartItems[index]._id;
            }

            return null;
        })
        .filter(Boolean);

        syncCartProducts(latestProducts, deletedProductIds);
        if (deletedProductIds.length > 0) {
            setCartNotice(
                `${deletedProductIds.length} product(s) removed because they are no longer available.`
        );
        }

        console.log("Cart synchronized:", latestProducts);
        } catch (error) {
        console.error(
            "Failed to refresh cart products:",
            error
        );
        } finally {
        setRefreshing(false);
        }
    };

    refreshProducts();
    }, []);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "consumer") {
    return <Navigate to="/" replace />;
  }


  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
            Your Shopping Cart
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            My Cart
          </h1>

          <p className="mt-2 text-gray-600">
            Review the fresh products you've selected.
          </p>
        </div>
        {cartNotice && (
            <div
                role="status"
                className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
                {cartNotice}
            </div>
        )}
        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-20 text-center">
            <div className="mb-4 text-5xl">🛒</div>

            <h2 className="text-2xl font-bold text-gray-900">
              Your cart is empty
            </h2>

            <p className="mt-3 text-gray-500">
              Explore fresh products from local farmers.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-block rounded-xl bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart items */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Cart Items ({cartItems.length})
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Clear all items from your cart?")) {
                      clearCart();
                    }
                  }}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Clear Cart
                </button>
              </div>

              {cartItems.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-32 w-full rounded-xl object-cover sm:w-32"
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500 sm:w-32">
                      No image
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      ₹{item.price.toFixed(2)} / {item.unit}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        {item.stock === 0 ? (
                        <span className="inline-block rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                            Out of Stock
                        </span>
                        ) : (
                        <div className="flex items-center rounded-lg border border-gray-300">
                            <button
                            type="button"
                            onClick={() =>
                                updateQuantity(item._id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="px-4 py-2 hover:bg-gray-100 disabled:opacity-40"
                            >
                            −
                            </button>

                            <span className="min-w-10 text-center font-semibold">
                            {item.quantity}
                            </span>

                            <button
                            type="button"
                            onClick={() =>
                                updateQuantity(item._id, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.stock}
                            className="px-4 py-2 hover:bg-gray-100 disabled:opacity-40"
                            >
                            +
                            </button>
                        </div>
                        )}

                      <p className="text-lg font-bold text-gray-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item._id)}
                      className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                Order Summary
              </h2>

              <div className="mt-6 flex justify-between text-gray-600">
                <span>Items ({cartCount})</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>

              <div className="mt-4 flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    Subtotal
                  </span>

                  <span className="text-2xl font-bold text-green-700">
                    ₹{cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <Link to="/checkout" className="mt-6 block w-full rounded-xl bg-green-700 px-5 py-3 text-center font-semibold text-white hover:bg-green-800">
                Proceed to Checkout
              </Link>

              <Link
                to="/products"
                className="mt-4 block text-center text-sm font-semibold text-green-700 hover:underline"
              >
                ← Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

export default Cart;
