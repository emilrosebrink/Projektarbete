import {
  PublicClientApplication,
  type Configuration,
} from "@azure/msal-browser";
import { getEnv } from "@/lib/window";

const env = getEnv();
const clientId = env?.AZURE_CLIENT_ID;
const tenantId = env?.AZURE_TENANT_ID;
const redirectUri = env?.REDIRECT_URI;

const config: Configuration = {
  auth: {
    clientId: clientId || "NOT-FOUND",
    authority: `https://login.microsoftonline.com/${tenantId || "NOT-FOUND"}`,
    redirectUri: redirectUri || "NOT-FOUND",
  },
  cache: { cacheLocation: "localStorage" },
};

export const pca = new PublicClientApplication(config);
