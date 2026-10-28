import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const CartContext = createContext(null);

function getCartKey(userId) {
  return `agri-cart-${userId}`;
}

function readCart(userId) {
  if (!userId) return [];

  try {
    const savedCart = localStorage.getItem(getCartKey(userId));
    const parsed = savedCart ? JSON.parse(savedCart) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
const getCurrentUserId = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user") || "null"
    )?.id ?? null;
  } catch {
    return null;
  }
};

const [cartState, setCartState] = useState(() => {
  const id = getCurrentUserId();

  return {
    userId: id,
    items: readCart(id),
  };
});

const userId = cartState.userId;
const cartItems = cartState.items;

const setCartItems = (updater) => {
  setCartState((previous) => ({
    ...previous,
    items:
      typeof updater === "function"
        ? updater(previous.items)
        : updater,
  }));
};

useEffect(() => {
  const syncUser = () => {
    const id = getCurrentUserId();

    setCartState({
      userId: id,
      items: readCart(id),
    });
  };

  window.addEventListener("storage", syncUser);
  window.addEventListener("auth-changed", syncUser);

  return () => {
    window.removeEventListener("storage", syncUser);
    window.removeEventListener("auth-changed", syncUser);
  };
}, []);

useEffect(() => {
  if (userId) {
    localStorage.setItem(
      getCartKey(userId),
      JSON.stringify(cartItems)
    );
  }
}, [userId, cartItems]);

  const addToCart = (product) => {
    if (Number(product.quantity) <= 0) return false;

    setCartItems((previousItems) => {
      const existingItem = previousItems.find(
        (item) => item._id === product._id
      );

      if (existingItem) {
        return previousItems.map((item) =>
          item._id === product._id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  Number(product.quantity)
                ),
              }
            : item
        );
      }

      return [
        ...previousItems,
        {
          _id: product._id,
          name: product.name,
          price: Number(product.price),
          unit: product.unit,
          image: product.image,
          stock: Number(product.quantity),
          quantity: 1,
        },
      ];
    });

    return true;
  };

const updateQuantity = (productId, newQuantity) => {
    setCartItems((previousItems) =>
        previousItems.map((item) => {
        if (item._id !== productId) {
            return item;
        }

        return {
            ...item,
            quantity: Math.max(
            1,
            Math.min(Number(newQuantity), item.stock)
            ),
        };
        })
    );
};
const syncCartProducts = (
  latestProducts,
  deletedProductIds = []
) => {
  setCartItems((previousItems) =>
    previousItems
      .filter(
        (item) => !deletedProductIds.includes(item._id)
      )
      .map((item) => {
        const latestProduct = latestProducts.find(
          (product) => product._id === item._id
        );

        if (!latestProduct) return item;

        const latestStock = Math.max(
          0,
          Number(latestProduct.quantity)
        );

        return {
          ...item,
          name: latestProduct.name,
          price: Number(latestProduct.price),
          unit: latestProduct.unit,
          image: latestProduct.image,
          stock: latestStock,
          quantity:
            latestStock === 0
              ? 0
              : Math.min(item.quantity, latestStock),
        };
      })
  );
};

  const removeFromCart = (productId) => {
    setCartItems((previousItems) =>
      previousItems.filter((item) => item._id !== productId)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        syncCartProducts,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}