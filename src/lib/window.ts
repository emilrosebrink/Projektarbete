export type RuntimeEnv = {
  AZURE_CLIENT_ID?: string;
  AZURE_TENANT_ID?: string;
  REDIRECT_URI?: string;
};

export function getWindow(): Window | undefined {
  if (typeof window !== "undefined") {
    return window;
  }
  return undefined;
}

export function getEnv(): RuntimeEnv {
  const win = getWindow();
  return win?.env || ({} as RuntimeEnv);
}

declare global {
  interface Window {
    env?: RuntimeEnv;
    // Add other custom window properties here if needed
  }
}
