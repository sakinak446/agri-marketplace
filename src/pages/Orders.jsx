import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { money, orderApi, orderError } from "../utils/orderApi";

const nextStatus = { pending: "confirmed", confirmed: "shipped", shipped: "delivered" };
const badge = { pending: "bg-amber-50 text-amber-800", confirmed: "bg-blue-50 text-blue-800", shipped: "bg-purple-50 text-purple-800", delivered: "bg-green-50 text-green-800", cancelled: "bg-red-50 text-red-800" };

export default function Orders({ farmer = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updating, setUpdating] = useState(null);
  async function load() {
    try {
      const response = await orderApi.get(`/orders/${farmer ? "farmer-orders" : "my-orders"}`);
      setError("");
      setOrders(response.data.orders);
    } catch (err) {
      setError(orderError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    orderApi.get(`/orders/${farmer ? "farmer-orders" : "my-orders"}`, { signal: controller.signal })
      .then(response => { setOrders(response.data.orders); setError(""); })
      .catch(err => { if (!controller.signal.aborted) setError(orderError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [farmer]);

  async function update(orderId, itemId, status) {
    if (updating) return;
    setUpdating(itemId);
    setError("");
    setSuccess("");
    try {
      const response = await orderApi.patch(`/orders/${orderId}/items/${itemId}/status`, { status });
      setOrders(previous => previous.map(order => order._id === orderId ? response.data.order : order));
      setSuccess(`Item marked as ${status}.`);
    } catch (err) { setError(`${orderError(err)} Refresh orders to see the latest status.`); }
    finally { setUpdating(null); }
  }

  return <><Navbar /><main className="mx-auto max-w-6xl px-6 py-12">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-green-700">{farmer ? "Your farm business" : "From farm to doorstep"}</p><h1 className="mt-2 text-3xl font-bold">{farmer ? "Farmer Orders" : "My Orders"}</h1><p className="mt-2 text-gray-500">{farmer ? "Manage fulfillment for your products. Each item has its own delivery status." : "Track your purchases and delivery progress."}</p></div><button type="button" disabled={loading || !!updating} onClick={() => { setLoading(true); setError(""); void load(); }} className="rounded-xl border border-gray-300 px-4 py-2 font-medium disabled:opacity-50">Refresh orders</button></div>
    {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {success && <p role="status" className="mt-6 rounded-xl bg-green-50 p-4 text-green-800">{success}</p>}
    {loading ? <p role="status" className="mt-8 text-gray-500">Loading orders...</p> : !orders.length && !error ? <div className="mt-8 rounded-2xl border border-gray-200 p-12 text-center"><h2 className="text-xl font-bold">No orders yet</h2><p className="mt-2 text-gray-500">{farmer ? "Orders containing your products will appear here." : "Your fresh finds are waiting for you."}</p><Link to={farmer ? "/my-products" : "/products"} className="mt-6 inline-block rounded-xl bg-green-700 px-5 py-3 font-semibold text-white">{farmer ? "View my products" : "Explore products"}</Link></div> : <div className="mt-8 space-y-6">{orders.map(order => <article key={order._id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap justify-between gap-4 border-b border-gray-100 bg-gray-50 p-6"><div><h2 className="break-all font-semibold">Order #{order._id}</h2><p className="mt-1 text-sm text-gray-500">{new Date(order.createdAt).toLocaleString("en-IN")}</p></div><div><p className="text-sm text-gray-500">{farmer ? "Your items total" : "Order total"}</p><p className="text-xl font-bold text-green-700">{money(farmer ? order.farmerTotal : order.totalAmount)}</p></div></div>
      <ul className="divide-y divide-gray-100 px-6">{order.items.map(item => {
        const status = order.status === "cancelled" ? "cancelled" : item.status || order.status || "pending";
        return <li key={item._id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h3 className="font-semibold">{item.name}</h3><p className="mt-1 text-sm text-gray-500">{item.quantity} × {money(item.price)} / {item.unit}</p><p className="mt-1 font-medium">{money(Math.round(item.price * 100) * item.quantity / 100)}</p></div><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${badge[status] || badge.pending}`}>{status}</span>{farmer && order.status !== "cancelled" && nextStatus[status] && <button type="button" disabled={!!updating} onClick={() => update(order._id, item._id, nextStatus[status])} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">{updating === item._id ? "Updating..." : `Mark ${nextStatus[status]}`}</button>}</div></li>;
      })}</ul><div className="border-t border-gray-100 px-6 py-5 text-sm"><p className="font-semibold text-gray-700">Delivery address</p><p className="mt-1 whitespace-pre-wrap break-words text-gray-600">{order.deliveryAddress}</p><p className="mt-3 text-gray-500">Payment: Cash on delivery</p></div>
    </article>)}</div>}
  </main></>;
}
