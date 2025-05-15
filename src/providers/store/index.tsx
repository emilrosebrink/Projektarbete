"use client";
import React, { useCallback, useMemo, useState } from "react";
import { createContext, ReactNode } from "react";

interface IStoreContext {
  userStore: string | undefined;
  updateUserStore: (storeName: string) => void;
}

export const StoreContext = createContext<IStoreContext | undefined>(undefined);

interface IStoreProvider {
  children: ReactNode;
}

const StoreProvider = ({ children }: IStoreProvider) => {
  const [userStore, setUserStore] = useState<string | undefined>("store");

  const updateUserStore = useCallback((storeName: string) => {
    setUserStore(storeName);
  }, []);

  const value = useMemo(
    () => ({
      userStore,

      updateUserStore,
    }),
    [
      userStore,

      updateUserStore,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};

export default StoreProvider;
