"use client";

import { getEnv } from "@/lib/window";
import { InteractionStatus } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  accessToken: string | null;
  logout: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { AZURE_CLIENT_ID } = getEnv();
  const [renderApp, setRenderApp] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { instance, accounts, inProgress } = useMsal();
  const account = accounts[0];

  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return;

    const appScopes = [`api://${AZURE_CLIENT_ID}/Service.Writer`];
    const graphScopes = ["User.Read"];

    const handleAuthentication = async () => {
      try {
        if (!account) {
          await instance.loginRedirect({ scopes: graphScopes });
          return;
        }
        const response = await instance.acquireTokenSilent({
          account,
          scopes: appScopes,
        });
        setAccessToken(response.accessToken);
        setRenderApp(true);
      } catch (err: any) {
        setError(
          "Failed to acquire access token. Please try again or contact support.",
        );
        console.error("AuthProvider error:", err);
        await instance.acquireTokenRedirect({ account, scopes: appScopes });
      }
    };
    handleAuthentication();
  }, [inProgress, instance, account, AZURE_CLIENT_ID]);

  // Log out the user. However without a log in page, the user will be logged in again after logging out
  // since account will be undefined or null in handleAuthentication that gets executed in the useEffect.
  const logout = async () => {
    await instance.logoutRedirect();
    setRenderApp(false);
  };

  const contextValue = {
    accessToken,
    logout,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {renderApp && !error && children}
      {error && (
        <div style={{ color: "red", padding: "2rem" }}>
          <h2>Authentication Error</h2>
          <p>{error}</p>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}
