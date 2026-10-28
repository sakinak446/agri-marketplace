import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";

function Products() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [category, setCategory] = useState("");
    const [sort, setSort] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart();
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    const handleAddToCart = (product) => {
    if (!token || !user) {
        navigate("/login");
        return;
    }

    if (user.role !== "consumer") {
        return;
    }

    addToCart(product);
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
            const response = await axios.get(
                "http://localhost:5000/api/products",
                {
                    params: {
                        search: debouncedSearch,
                        category: category,
                        sort: sort,
                        minPrice: minPrice,
                        maxPrice: maxPrice,
                        page: page,
                        limit: 6,
                    },
                }
            );

            setProducts(response.data.products);
            setTotalPages(response.data.totalPages);
            } catch (error) {
            setError("Unable to load products. Please try again.");
            }finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [debouncedSearch, category, sort, minPrice, maxPrice, page]);
    useEffect(() => {
        const timer = setTimeout(() => {
        setDebouncedSearch(search);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, category, sort, minPrice, maxPrice]);
  return (
    <>
      <Navbar />

        <main className="mx-auto max-w-7xl px-6 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
            Marketplace
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Browse fresh products
            </h1>

            <p className="mt-3 text-gray-600">
            Fresh produce directly from local farmers.
            </p>
            {/* Search FILTER */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <input
                    aria-label="Search products"
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 lg:col-span-2"
                />
                <select
                    aria-label="Filter by category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                    >
                    <option value="">All Categories</option>
                    <option value="vegetables">Vegetables</option>
                </select>
                <select
                    aria-label="Sort products"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                >
                    <option value="">Default</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                </select>
                <div className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-2">
                    <input
                        type="number"
                        placeholder="Min price"
                        aria-label="Minimum price"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                    />

                    <input
                        type="number"
                        placeholder="Max price"
                        aria-label="Maximum price"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                    />
                </div>
            </div>
            {loading ? (
                <div className="mt-16 text-center">
                    <p className="text-gray-500">Loading products...</p>
                </div>
                ) : error ? (
                <div className="mt-16 text-center">
                    <p className="text-gray-500">{error}</p>
                </div>
                ) : products.length > 0 ? (
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                    <ProductCard key={product._id} product={product}>
                        {user?.role === "consumer" && (() => {
                            const cartItem = cartItems.find(
                            (item) => item._id === product._id
                            );

                            return cartItem ? (
                            <div className="flex h-12 items-center justify-between rounded-lg border border-green-700">
                                <button
                                type="button"
                                onClick={() => {
                                    if (cartItem.quantity === 1) {
                                    removeFromCart(product._id);
                                    } else {
                                    updateQuantity(
                                        product._id,
                                        cartItem.quantity - 1
                                    );
                                    }
                                }}
                                className="h-full w-14 rounded-l-lg bg-green-700 text-xl font-bold text-white transition hover:bg-green-800 cursor-pointer"
                                >
                                −
                                </button>

                                <span className="text-lg font-bold text-green-800">
                                {cartItem.quantity}
                                </span>

                                <button
                                type="button"
                                onClick={() =>
                                    updateQuantity(
                                    product._id,
                                    cartItem.quantity + 1
                                    )
                                }
                                disabled={cartItem.quantity >= product.quantity}
                                className="h-full w-14 rounded-r-lg bg-green-700 text-xl font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300 cursor-pointer"
                                >
                                +
                                </button>
                            </div>
                            ) : (
                            <button
                                type="button"
                                onClick={() => handleAddToCart(product)}
                                disabled={product.quantity <= 0}
                                className="h-12 w-full rounded-lg bg-green-700 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300 cursor-pointer"
                            >
                                {product.quantity <= 0
                                ? "Out of Stock"
                                : "Add to Cart"}
                            </button>
                            );
                        })()}
                    </ProductCard>
                    ))}
                </div>
                ) : (
                <div className="mt-16 text-center">
                    <h3 className="text-xl font-semibold text-gray-900">
                    No products found
                    </h3>

                    <p className="mt-2 text-gray-500">
                    Try changing your search or filters.
                    </p>
                </div>
            )}
            {!loading && !error && totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-4">
                    <button
                    onClick={() => setPage((prev) => prev - 1)}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                    >
                    Previous
                    </button>

                    <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                    </span>

                    <button
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={page === totalPages}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                    >
                    Next
                    </button>
                </div>
                )}
        </main>
    </>
  );
}

export default Products;
