function ProductCard({ product , children }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {product.image ? (
                <img
                    src={product.image}
                    alt={product.name}
                    className="mb-5 h-48 w-full rounded-xl object-cover"
                />
                ) : (
                <div className="mb-5 flex h-48 items-center justify-center rounded-xl bg-green-50">
                    <span className="text-sm font-medium text-green-700">
                    No image available
                    </span>
                </div>
            )}
            <p className="text-sm font-medium capitalize text-green-700">
                {product.category}
            </p>

            <h3 className="mt-2 text-xl font-bold text-gray-900">
                {product.name}
            </h3>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                {product.description}
            </p>

            <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">
                ₹{product.price}
                <span className="text-sm font-normal text-gray-500">
                    {" "} / {product.unit}
                </span>
                </p>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                {product.quantity} {product.unit} available
                </span>
            </div>
            {children && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                    {children}
                </div>
            )}
        </div>
    );
}

export default ProductCard;