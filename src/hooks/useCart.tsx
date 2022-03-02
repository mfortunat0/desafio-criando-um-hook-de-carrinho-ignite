import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const STORAGE_KEY = "@RocketShoes";
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(`${STORAGE_KEY}:cart`);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get<Product>(
        `/products/${productId}`
      );
      if (!product) {
        throw new Error("Erro na adição do produto");
      }

      const matchProduct = cart.some((product) => product.id === productId);
      if (matchProduct) {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        const newCart = cart.map((product) => {
          if (product.id === productId) {
            const updateAmount = product.amount + 1;
            if (updateAmount > stock.amount) {
              throw new Error("Quantidade solicitada fora de estoque");
            } else {
              return {
                ...product,
                amount: updateAmount,
              };
            }
          }
          return product;
        });
        setCart(newCart);
        localStorage.setItem(`${STORAGE_KEY}:cart`, JSON.stringify(newCart));
      } else {
        const { data: productReponse } = await api.get(
          `/products/${productId}`
        );

        const product = {
          ...productReponse,
          amount: 1,
        };
        const newCart = [...cart, product];
        setCart(newCart);
        localStorage.setItem(`${STORAGE_KEY}:cart`, JSON.stringify(newCart));
      }
    } catch (err: any) {
      const msg = err.message.includes("Quantidade")
        ? "Quantidade solicitada fora de estoque"
        : "Erro na adição do produto";
      toast.error(msg);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const matchProduct = cart.some((product) => product.id === productId);
      if (!matchProduct) {
        throw new Error("Erro na remoção do produto");
      }
      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem(`${STORAGE_KEY}:cart`, JSON.stringify(newCart));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const matchProduct = cart.some((product) => product.id === productId);
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount <= 0 || amount > stock.amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      if (!matchProduct) {
        throw new Error("Erro na alteração de quantidade do produto");
      }

      const newCart = cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            amount: amount,
          };
        }
        return product;
      });
      setCart(newCart);
      localStorage.setItem(`${STORAGE_KEY}:cart`, JSON.stringify(newCart));
    } catch (err: any) {
      const msg = err.message.includes("Quantidade")
        ? "Quantidade solicitada fora de estoque"
        : "Erro na alteração de quantidade do produto";
      toast.error(msg);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
