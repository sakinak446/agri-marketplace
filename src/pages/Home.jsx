import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import homeHero from "../assets/home-hero.png";
import { useEffect , useState } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
function Home(){
    const [products, setProducts] = useState([]);

        useEffect(() => {
        const fetchProducts = async () => {
            try {
            const response = await axios.get(
                "http://localhost:5000/api/products?limit=4"
            );

            console.log("Products response:", response.data);
            setProducts(response.data.products);
            } catch (error) {
            console.error("Failed to fetch products:", error);
            }
        };

        fetchProducts();
    }, []);

    return (
        <div>
            <Navbar />
            <section className="bg-green-50">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-20">
                    <div>
                        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
                        Fresh from local farms
                        </p>

                        <h1 className="text-5xl font-bold leading-tight tracking-tight text-gray-900">
                        Fresh produce,
                        <br />
                        directly from farmers.
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
                        Discover fresh, locally grown products and support farmers in your
                        community.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link
                            to="/products"
                            className="rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
                            >
                            Explore Products
                            </Link>

                            <Link
                            to="/register"
                            className="rounded-xl border border-green-700 px-6 py-3 font-semibold text-green-700 transition hover:bg-green-50"
                            >
                            Join as Farmer
                            </Link>
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <img
                        src={homeHero}
                        alt="Farmer holding fresh vegetables"
                        className="h-[420px] w-full rounded-3xl object-cover shadow-xl"
                        />
                    </div>
                </div>
                <section className="bg-white py-16">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
                                    Marketplace
                                </p>

                                <h2 className="mt-2 text-3xl font-bold text-gray-900">
                                    Fresh from our farmers
                                </h2>

                                <p className="mt-2 text-gray-600">
                                    Discover fresh products available directly from local farmers.
                                </p>
                            </div>

                            <Link
                            to="/products"
                            className="text-sm font-semibold text-green-700 hover:text-green-800"
                            >
                            View all products →
                            </Link>
                        </div>
                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {products.map((product) => (
  <ProductCard
    key={product._id}
    product={product}
  />
))}
                        </div>
                    </div>
                </section>
            </section>
        </div>
    );
}
export default Home;