"use client";

import { pca } from "@/auth/msalConfig";
import StyledComponentsRegistry from "@/lib/registry";
import { MsalProvider } from "@azure/msal-react";
import StoreProvider from "./store";
import AuthProvider from "./auth";

export default function GlobalProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <MsalProvider instance={pca}>
    //   <AuthProvider>
    <StoreProvider>
      <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
    </StoreProvider>
    //   </AuthProvider>
    // </MsalProvider>
  );
}
