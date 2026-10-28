import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";

function MyProducts() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchMyProducts = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await axios.get(
                    "http://localhost:5000/api/products/my-products",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                console.log("My products:", response.data);
                setProducts(response.data.products);
            } catch (error) {
                console.error(
                    "Failed to fetch my products:",
                    error.response?.data
                );
            }
        };

        fetchMyProducts();
    }, []);
    const handleDelete = async (productId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this product?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const token = localStorage.getItem("token");

            await axios.delete(
                `http://localhost:5000/api/products/${productId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setProducts((prevProducts) =>
                prevProducts.filter((product) => product._id !== productId)
            );
            console.log("Product deleted:", productId);
        } catch (error) {
            console.error(
                "Failed to delete product:",
                error.response?.data
            );
        }
    };
    return (
        <>
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-12">
                <div className="flex items-end justify-between gap-6">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
                            Farmer Dashboard
                        </p>

                        <h1 className="mt-2 text-3xl font-bold text-gray-900">
                            My Products
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Manage the products you have listed on the marketplace.
                        </p>
                    </div>
                    <Link
                        to="/add-product"
                        className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800">
                        + Add Product
                    </Link>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                        <ProductCard
                            key={product._id}
                            product={product}
                        >
                            <div className="flex gap-3">
                                <Link
                                    to={`/edit-product/${product._id}`}
                                    className="flex-1 rounded-lg border border-green-600 px-4 py-2 text-center font-medium text-green-700 hover:bg-green-50"
                                >
                                    Edit
                                </Link>

                                <button
                                    type="button"
                                     onClick={() => handleDelete(product._id)}
                                    className="flex-1 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                                >
                                    Delete
                                </button>
                            </div>
                        </ProductCard>
                    ))}
                </div>
            </main>
        </>
    );
}

export default MyProducts;