import { missingGoogleConfigNames, requireGoogleConfig, type GoogleDocsConfig, type GoogleDocsConfigLoad } from "./config.js";
import { loadConfigFromEnvAndStore } from "./secret-store.js";
import { refreshAccessToken } from "./oauth.js";
import { createAuthorizedTransport, type GoogleTransport } from "./google-rest.js";

export function loadGoogleDocsConfig(
  env: NodeJS.ProcessEnv = process.env,
  storePath?: string,
): GoogleDocsConfigLoad {
  const loaded = storePath
    ? loadConfigFromEnvAndStore(env, storePath)
    : loadConfigFromEnvAndStore(env);
  const missing = missingGoogleConfigNames(loaded);
  const config: GoogleDocsConfig = {
    clientId: loaded.clientId ?? "",
    clientSecret: loaded.clientSecret ?? "",
    refreshToken: loaded.refreshToken ?? "",
  };
  const withOptional: GoogleDocsConfig = {
    ...config,
    ...(loaded.folderId ? { folderId: loaded.folderId } : {}),
    ...(loaded.accountEmail ? { accountEmail: loaded.accountEmail } : {}),
  };
  return { config: withOptional, missing, source: loaded.source };
}

export async function createLiveTransport(
  config: GoogleDocsConfig,
): Promise<GoogleTransport> {
  const required = requireGoogleConfig({
    config,
    missing: missingGoogleConfigNames(config),
    source: "env",
  });
  const { accessToken } = await refreshAccessToken(required);
  return createAuthorizedTransport(accessToken);
}
