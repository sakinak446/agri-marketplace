import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

function Navbar() {

    const user = JSON.parse(localStorage.getItem("user"));
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/login";
        window.dispatchEvent(new Event("auth-changed"));
    };
    const { cartCount } = useCart();
  return (
    <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-700 text-xl text-white">
                    🌱
                </div>

                <span className="text-xl font-bold text-gray-900">
                    Agri Marketplace
                </span>
                <div className="flex flex-wrap items-center gap-4 md:ml-6">
                    <Link to="/"
                    className="text-sm font-medium text-gray-700 transition hover:text-green-700">
                        Home
                    </Link>

                    <Link to="/products"
                    className="text-sm font-medium text-gray-700 transition hover:text-green-700">
                        Products
                    </Link>

                    {user?.role === "farmer" && (
                        <>
                            <Link to="/farmer-orders" 
                            className="text-sm font-medium text-gray-700 hover:text-green-700">Orders</Link>
                            <Link
                            to="/my-products"
                            className="text-sm font-medium text-gray-700 transition hover:text-green-700"
                            >
                            My Products
                            </Link>

                            <Link
                            to="/add-product"
                            className="text-sm font-medium text-gray-700 transition hover:text-green-700"
                            >
                            Add Product
                            </Link>
                        </>
                    )}
                    {user?.role === "consumer" && (
                        <>
                        <Link to="/my-orders" className="text-sm font-medium text-gray-700 hover:text-green-700">My Orders</Link>
                        <Link
                            to="/cart"
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 transition hover:text-green-700"
                        >
                            <span>🛒 Cart</span>

                            {cartCount > 0 && (
                            <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
                                {cartCount}
                            </span>
                            )}
                        </Link>
                        </>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                {user ? (
                    <>
                        <span className="text-sm font-medium text-gray-700">
                            Hi, {user.name}
                        </span>

                        <button
                            onClick={handleLogout}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-green-600 hover:text-green-700"
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                    <Link
                        to="/login"
                        className="text-sm font-medium text-gray-700 transition hover:text-green-700"
                    >
                        Login
                    </Link>

                    <Link
                        to="/register"
                        className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
                    >
                        Create Account
                    </Link>
                    </>
                )}
            </div>
        </div>
    </nav>
  );
}

export default Navbar;
