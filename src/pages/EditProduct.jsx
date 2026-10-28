import { API_URL } from "../config/api";
import { useEffect , useState , useMemo , useRef  } from "react";
import { Link , useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function EditProduct() {
    const { id } = useParams();
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [unit, setUnit] = useState("kg");
    const [quantity, setQuantity] = useState("");
    const [category, setCategory] = useState("vegetables");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState(null);
    const [currentImage, setCurrentImage] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [fetchLoading, setFetchLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    const fileInputRef = useRef(null);

    const newImagePreview = useMemo(() => {
        return image ? URL.createObjectURL(image) : null;
        }, [image]);

        useEffect(() => {
        return () => {
            if (newImagePreview) {
            URL.revokeObjectURL(newImagePreview);
            }
        };
    }, [newImagePreview]);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(
                    `${API_URL}/api/products/${id}`
                );

                const product = response.data.product;

                const loggedInUser = JSON.parse(
                    localStorage.getItem("user") || "null"
                );
                
                if (
                    !loggedInUser ||
                    loggedInUser.role !== "farmer" ||
                    String(product.farmer?._id) !== String(loggedInUser.id)
                    ) {
                    setFetchError("You are not authorized to edit this product.");
                    return;
                }

                console.log("Logged-in user:", loggedInUser);
                console.log("Product farmer:", product.farmer);

                setName(product.name);
                setPrice(product.price);
                setUnit(product.unit);
                setQuantity(product.quantity);
                setCategory(product.category);
                setDescription(product.description || "");
                setCurrentImage(product.image || "");

                console.log("Product:", response.data);
            } catch (error) {
                console.error("Failed to fetch product:", error);

                setFetchError(
                    error.response?.data?.message ||
                    "Unable to load product details. Please try again."
                );
            } finally {
                setFetchLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    console.log("Product ID:", id);

    const handleUpdate = async () => {
        if (loading) return;
        setErrorMessage("");
        setSuccessMessage("");

        if (!name.trim()) {
            setErrorMessage("Product name is required.");
            return;
        }

        if (String(price).trim() === "" || !Number.isFinite(Number(price)) || Number(price) <= 0) {
            setErrorMessage("Price must be greater than zero.");
            return;
        }

        if (String(quantity).trim() === "" || !Number.isFinite(Number(quantity)) || Number(quantity) < 0) {
            setErrorMessage("Quantity cannot be negative.");
            return;
        }
        setLoading(true);
        setSuccessMessage("");
        try {
            const token = localStorage.getItem("token");
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

            const response = await axios.put(
                `${API_URL}/api/products/${id}`,
                formData,
                {
                    headers: {
                    Authorization: `Bearer ${token}`,
                    },
                }
            );

            setCurrentImage(response.data.product.image || "");
            setImage(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            console.log("Product updated:", response.data);

            setSuccessMessage("Product updated successfully!");
        } catch (error) {
            console.error(
            "Update failed:",
            error.response?.data || error.message
            );
            setErrorMessage(
                error.response?.data?.message ||
                "Failed to update product. Please try again."
            );
        }finally {
        setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <>
            <Navbar />
            <div className="py-20 text-center text-gray-600">
                Loading product...
            </div>
            </>
        );
    }

    if (fetchError) {
        return (
            <>
            <Navbar />

            <div className="mx-auto max-w-2xl px-6 py-20 text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                Unable to load product
                </h2>

                <p className="mt-3 text-gray-600">
                {fetchError}
                </p>

                <Link
                to="/my-products"
                className="mt-6 inline-block font-medium text-green-700 hover:underline"
                >
                ← Back to My Products
                </Link>
            </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-2xl px-6 py-12">
                <Link
                to="/my-products"
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-green-700 transition hover:text-green-900"
                >
                <span aria-hidden="true">←</span>
                Back to My Products
                </Link>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
                        Farmer Dashboard
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-gray-900">
                        Edit Product
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Update your product details.
                    </p>

                    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
                        <label className="block text-sm font-medium text-gray-900">
                            Product name
                        </label>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                        />
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-900">
                                    Price
                                </label>

                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900">
                                    Unit
                                </label>

                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                                >
                                    <option value="kg">Kilogram (kg)</option>
                                    <option value="gram">Gram</option>
                                    <option value="piece">Piece</option>
                                    <option value="dozen">Dozen</option>
                                    <option value="liter">Litre</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-900">
                                    Quantity
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                                />
                                </div>

                                <div>
                                <label className="block text-sm font-medium text-gray-900">
                                    Category
                                </label>

                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-600"
                                >
                                    <option value="vegetables">Vegetables</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-5">
                            <label className="block text-sm font-medium text-gray-900">
                                Description
                            </label>

                            <textarea
                                rows="4"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter product description"
                                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                            />
                        </div>
                        <div className="mt-5">
                            <label className="block text-sm font-medium text-gray-900">
                                Product Image
                            </label>

                            {/* Existing image */}
                            {currentImage ? (
                                <img
                                src={currentImage}
                                alt="Current product"
                                className="mt-3 h-40 w-40 rounded-xl border border-gray-200 object-cover"
                                />
                                
                            ) : (
                                <p className="mt-3 text-sm text-gray-500">
                                No image available
                                </p>
                            )}
                    
                        </div>
                        {/* Choose replacement image */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImage(e.target.files[0] || null)}
                            className="
                                mt-4 block w-full
                                rounded-xl border border-gray-300
                                bg-white p-2 text-sm text-gray-600
                                file:mr-4
                                file:cursor-pointer
                                file:rounded-lg
                                file:border-0
                                file:bg-green-50
                                file:px-4
                                file:py-2
                                file:font-semibold
                                file:text-green-700
                                hover:file:bg-green-100
                            "
                        />
                        {/* Selected image filename */}
                        {image && (
                            <p className="mt-2 text-sm text-green-700">
                                New image selected: {image.name}
                            </p>
                        )}
                        {newImagePreview && (
                            <div className="mt-4">
                                <p className="mb-2 text-sm font-medium text-gray-700">
                                New Image Preview
                                </p>

                                <img
                                src={newImagePreview}
                                alt="New product preview"
                                className="h-40 w-40 rounded-xl border border-green-200 object-cover"
                                />
                            </div>
                        )}
                        {successMessage && (
                            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                                {successMessage}
                            </div>
                        )}
                        {errorMessage && (
                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                {errorMessage}
                            </div>
                        )}
                        <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={loading}
                        className="mt-6 w-full rounded-xl bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                        {loading ? "Updating..." : "Update Product"}
                        </button>
                    </div>
                </div>
            </main>
        </>
);
}

export default EditProduct;
