import { API_URL } from "../config/api";
import { useState } from 'react';
import axios from 'axios';
import { Link , useNavigate } from 'react-router-dom';
import heroImage from '../assets/hero.png';

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, 
                { email, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            window.dispatchEvent(new Event("auth-changed"));
            navigate("/"); // Redirect to home page after successful login
        } catch (error) {
            setError(error.response?.data?.message || "Login failed");
            console.error("Login Error:", error.response?.data);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center">
            <div className="w-full max-w-6xl min-h-[650px] bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="grid min-h-[650px] md:grid-cols-2">
                    {/* Left side*/}
                    <div className="relative hidden md:block">
                        <img
                            src={heroImage}
                            alt="Fresh vegetables harvested from a farm"
                            className="absolute inset-0 h-full w-full object-cover object-right"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-green-950/90 via-green-900/20 to-transparent">
                            <div className="absolute bottom-0 left-0 p-10 text-white">
                                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em]">
                                    Farm to Table
                                </p>

                                <h2 className="text-4xl font-bold leading-tight">
                                    Fresh produce.
                                    <br />
                                    Direct from farmers.
                                </h2>

                                <p className="mt-4 max-w-sm text-sm leading-6 text-green-50">
                                    Discover fresh, locally grown products and support farmers in your
                                    community.
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Right side - Login */}
                    <div className="flex items-center justify-center p-8 md:p-12">
                        <div className="w-full max-w-md">
                            <div className="mb-8">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-700 text-xl text-white">
                                    🌱
                                    </div>

                                    <span className="text-xl font-bold text-gray-900">
                                    Agri Marketplace
                                    </span>
                                </div>

                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                    Welcome back
                                </h1>

                                <p className="mt-2 text-sm leading-6 text-gray-500">
                                    Sign in to your account to continue to the marketplace.
                                </p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full mb-2 rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"/>
                                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        autoComplete="current-password"
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full mb-2 rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"/>
                                    {error && <p>{error}</p>}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                        {loading ? "Signing in..." : "Login"}
                                    </button>
                                </div>
                                <p className="mt-6 text-center text-sm text-gray-500">
                                    Don't have an account?{" "}
                                    <Link
                                        to="/register"
                                        className="font-semibold text-green-700 hover:text-green-800"
                                    >
                                        Create an account
                                    </Link>
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}  
export default Login;
