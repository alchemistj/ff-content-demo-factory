/**
 * Search input for compass~crawler-google-places.
 * Reviews stay off. Closed places stay in the list so rank still matches
 * the position Google returned.
 */

import type { ScoutRequest } from "./request.js";

export function buildScoutActorInput(request: ScoutRequest): Record<string, unknown> {
  return {
    searchStringsArray: [request.query],
    locationQuery: request.location,
    maxCrawledPlacesPerSearch: request.maxPlaces,
    language: "en",
    skipClosedPlaces: false,
    scrapePlaceDetailPage: false,
    scrapeContacts: false,
    maxReviews: 0,
    maxImages: 0,
  };
}
