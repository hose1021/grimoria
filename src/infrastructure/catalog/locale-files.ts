// The locale catalogs the app can request, and the only ones the offline
// generator precaches. `scripts/build-offline.mjs` imports this module, so the
// loader and the asset list cannot disagree.
export const LOCALE_FILES: Record<string, string> = {
  en: "en_GB",
  ru: "ru_RU",
  az: "az_AZ",
};
