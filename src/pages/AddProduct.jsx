import Navbar from "../components/Navbar";
import { useRef, useState } from "react";
import axios from "axios";

function AddProduct() {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [unit, setUnit] = useState("kg");
    const [quantity, setQuantity] = useState("");
    const [category, setCategory] = useState("vegetables");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        
        formData.append("name", name);
        formData.append("price", price);
        formData.append("unit", unit);
        formData.append("quantity", quantity);
        formData.append("category", category);
        formData.append("description", description);

        if (image) {
            formData.append("image", image);
        }
        
        const token = localStorage.getItem("token");
        try {
            const response = await axios.post(
                "http://localhost:5000/api/products",
                formData,
                {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                }
            );
            // API succeeded
            setMessage("Product added successfully!");

            // Reset form fields
            setError("");
            setName("");
            setPrice("");
            setUnit("kg");
            setQuantity("");
            setCategory("vegetables");
            setDescription("");
            setImage(null);
            fileInputRef.current.value = "";
        } catch (error) {
            console.log("Create product error:", error.response?.data);
            setError(error.response?.data?.message || "Failed to add product");
            setMessage("");
        } finally {
            setLoading(false);
        }
        console.log("Form data:", {
            name,
            price,
            unit,
            quantity,
            category,
            description,
            image,
        });
    };
  return (
    <>
        <Navbar />

        <main className="mx-auto max-w-3xl px-6 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
            Farmer Dashboard
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Add a new product
            </h1>

            <p className="mt-3 text-gray-600">
            Add your fresh produce to the marketplace.
            </p>
            {message && (
                <div className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {message}
                </div>
                )}

                {error && (
                <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="mt-10 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Product name
                    </label>

                    <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fresh Tomatoes"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                    />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Price
                        </label>

                        <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 45"
                        min="0"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Unit
                        </label>

                        <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                            >
                            <option value="kg">Kilogram (kg)</option>
                            <option value="gram">Gram</option>
                            <option value="piece">Piece</option>
                            <option value="dozen">Dozen</option>
                            <option value="liter">Litre</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Quantity
                        </label>

                        <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g. 100"
                        min="0"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Category
                        </label>

                        <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                        >
                        <option value="vegetables">Vegetables</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Description
                    </label>

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your product..."
                        rows="4"
                        maxLength="500"
                        className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                    />
                </div>
                <div className="mt-6">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Product image
                    </label>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImage(e.target.files[0])}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-600
                                file:mr-4 file:rounded-lg file:border-0 file:bg-green-50
                                file:px-4 file:py-2 file:font-semibold file:text-green-700
                                hover:file:bg-green-100"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="mt-8 w-full rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                >
                    {loading ? "Adding Product..." : "Add Product"}
                </button>
            </form>
        </main>
    </>
  );
}

export default AddProduct;
