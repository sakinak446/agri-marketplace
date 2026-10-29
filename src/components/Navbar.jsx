import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const { cartCount } = useCart();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setMenuOpen(false);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  const links = [
    { label: "Home", to: "/" },
    { label: "Products", to: "/products" },
    ...(user?.role === "farmer"
      ? [
          { label: "Orders", to: "/farmer-orders" },
          { label: "My Products", to: "/my-products" },
          { label: "Add Product", to: "/add-product" },
        ]
      : []),
    ...(user?.role === "consumer"
      ? [
          { label: "My Orders", to: "/my-orders" },
          { label: "🛒 Cart", to: "/cart" },
        ]
      : []),
  ];

  const renderLinks = (mobile = false) =>
    links.map((link) => (
      <Link
        key={link.to}
        to={link.to}
        onClick={() => setMenuOpen(false)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-green-50 hover:text-green-700 ${
          location.pathname === link.to
            ? "bg-green-50 text-green-700"
            : "text-gray-700"
        } ${mobile ? "w-full" : ""}`}
      >
        {link.label}
        {link.to === "/cart" && cartCount > 0 && (
          <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
            {cartCount}
          </span>
        )}
      </Link>
    ));

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex shrink-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-700 text-xl text-white">
              🌱
            </div>
            <span className="text-lg font-bold text-gray-900 sm:text-xl">
              Agri Marketplace
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            {renderLinks()}
          </div>

          {/* Desktop account actions */}
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            {user ? (
              <>
                <span className="text-sm font-medium text-gray-700">
                  Hi, {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-green-600 hover:text-green-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-700">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 lg:hidden"
          >
            {menuOpen ? (
              <span className="text-2xl">×</span>
            ) : (
              <span className="text-2xl">☰</span>
            )}
          </button>
        </div>

        {/* Mobile navigation */}
        {menuOpen && (
          <div
            id="mobile-navigation"
            className="mt-4 border-t border-gray-200 pt-4 lg:hidden"
          >
            <div className="flex flex-col gap-1">{renderLinks(true)}</div>

            <div className="mt-4 border-t border-gray-200 pt-4">
              {user ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    Hi, {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-medium text-gray-700"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
