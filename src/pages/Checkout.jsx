import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { money, orderApi, orderError } from "../utils/orderApi";

export default function Checkout() {
  const { cartItems, clearCart } = useCart();
  const [products, setProducts] = useState([]);
  const [address, setAddress] = useState("");
  const [loadedIds, setLoadedIds] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const locked = useRef(false);
  const ids = JSON.stringify(cartItems.map(item => item._id));
  const loading = loadedIds !== ids;

  useEffect(() => {
    let active = true;
    Promise.all(JSON.parse(ids).map(id => orderApi.get(`/products/${id}`)))
      .then(results => { if (active) { setProducts(results.map(result => result.data.product)); setError(""); } })
      .catch(err => { if (active) { setProducts([]); setError(err.response?.status === 404 ? "A product is no longer available. Return to your cart to review it." : orderError(err)); } })
      .finally(() => { if (active) setLoadedIds(ids); });
    return () => { active = false; };
  }, [ids]);

  const lines = cartItems.map(item => ({ ...item, live: products.find(product => product._id === item._id) }));
  const unavailable = lines.some(item => !item.live || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > item.live.quantity || !Number.isFinite(item.live.price) || item.live.price < 0);
  const total = lines.reduce((sum, item) => sum + Math.round((item.live?.price || 0) * 100) * item.quantity, 0) / 100;

  async function submit(event) {
    event.preventDefault();
    if (locked.current || loading || unavailable || !cartItems.length) return;
    locked.current = true;
    setSubmitting(true);
    setError("");
    try {
      const latest = await Promise.all(cartItems.map(item => orderApi.get(`/products/${item._id}`)));
      const fresh = latest.map(result => result.data.product);
      setProducts(fresh);
      if (fresh.some(product => {
        const item = lines.find(line => line._id === product._id);
        return product.price !== item.live.price || product.quantity < item.quantity;
      })) {
        setError("Prices or availability changed. Review the updated summary before placing your order.");
        return;
      }
      const response = await orderApi.post("/orders", {
        items: cartItems.map(item => ({ product: item._id, quantity: item.quantity })),
        deliveryAddress: address.trim(), paymentMethod: "COD",
      });
      if (!response.data.success || !response.data.order?._id) throw new Error("Order confirmation missing");
      setOrder(response.data.order);
      clearCart();
    } catch (err) {
      setError(`${orderError(err)} If confirmation was interrupted, check My Orders before retrying.`);
    } finally {
      locked.current = false;
      setSubmitting(false);
    }
  }

  return <><Navbar /><main className="mx-auto max-w-6xl px-6 py-12">
    <p className="text-sm font-semibold uppercase tracking-widest text-green-700">Fresh from the farm</p>
    <h1 className="mt-2 text-3xl font-bold text-gray-900">Checkout</h1>
    {order ? <div role="status" className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-8">
      <h2 className="text-2xl font-bold text-green-900">Your order is placed</h2>
      <p className="mt-3 break-all">Order #{order._id}</p><p className="mt-2">Pay {money(order.totalAmount)} in cash on delivery.</p>
      <Link to="/my-orders" className="mt-6 inline-block font-semibold text-green-800 underline">View My Orders</Link>
    </div> : !cartItems.length ? <div className="mt-8 rounded-2xl border border-gray-200 p-8"><p>Your cart is empty.</p><Link to="/products" className="mt-4 inline-block text-green-700 underline">Explore products</Link></div> : <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error} <Link className="underline" to="/my-orders">My Orders</Link></p>}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Delivery details</h2>
          <label htmlFor="address" className="mt-5 block text-sm font-medium text-gray-700">Full delivery address</label>
          <textarea id="address" required minLength={10} maxLength={1000} value={address} onChange={event => setAddress(event.target.value)} disabled={submitting} rows={5} placeholder="Recipient name, phone, house/street, locality, city, state and postal code" className="mt-2 w-full rounded-xl border border-gray-300 p-3 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100" />
          <p className="mt-2 text-sm text-gray-500">Include a contact number so the farmer can arrange delivery.</p>
        </section>
        <section className="rounded-2xl border border-green-200 bg-green-50 p-6"><h2 className="text-xl font-bold">Cash on delivery</h2><p className="mt-2 text-gray-600">Pay in cash when your products arrive. No online payment is required.</p></section>
      </div>
      <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Order summary</h2>
        {loading ? <p role="status" className="mt-4 text-gray-500">Checking prices and availability...</p> : <ul className="mt-5 divide-y divide-gray-100">{lines.map(item => <li key={item._id} className="py-3"><div className="flex justify-between gap-3"><span>{item.live?.name || item.name}</span><span>{item.live ? money(Math.round(item.live.price * 100) * item.quantity / 100) : "Unavailable"}</span></div><p className="mt-1 text-sm text-gray-500">{item.quantity} × {item.live ? money(item.live.price) : "—"} / {item.live?.unit || item.unit}</p>{(!item.live || item.quantity < 1 || item.quantity > item.live.quantity) && <p className="mt-1 text-sm text-red-600">Unavailable quantity. Update your cart.</p>}</li>)}</ul>}
        <div className="mt-4 flex justify-between text-sm text-gray-600"><span>Delivery</span><span>Free</span></div>
        <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 text-xl font-bold"><span>Total</span><span className="text-green-700">{money(total)}</span></div>
        <button disabled={loading || submitting || unavailable || address.trim().length < 10} className="mt-6 w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Placing order..." : "Place order · COD"}</button>
        <Link to="/cart" className="mt-4 block text-center text-sm font-semibold text-green-700 underline">Return to cart</Link>
      </aside>
    </form>}
  </main></>;
}
