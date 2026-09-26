# Frontend Feature: Weather

**Owner:** carolynl950
**Status:** Not implemented

Renders the weather module in both compact and expanded form, and displays the grounded
clothing and essentials suggestions returned by the backend.

Expansion is driven by a typed UI event, not by string matching spoken phrases. This module
owns the expansion and fade animation; the assistant only requests it.

Suggestions displayed here must come from the fetched forecast and event context. Never render
invented conditions. Fixture-sourced data (`provenance.isFixture`) must be visibly labeled.

## Planned display

All values in imperial units (°F, mph, inches), as returned by the backend.

- **Compact tile (overview):** current temperature, condition, the afternoon high/low, and the
  most important suggestion.
- **Expanded view:** hourly outlook from now to the event, precipitation and UV, and every
  suggestion with its reason (for example "Umbrella — 70% chance of rain at 5 PM").
- **States:** loading, `external-provider-unavailable` ("Weather unavailable"), `no-data`,
  and a visible fixture label when applicable.

## Planned future files

Compact tile, expanded view, and the presentation of clothing/packing recommendations.

## Does NOT own

Weather provider requests, API credentials, or recommendation logic that belongs to the
backend weather feature. Suggestion rules and unit conversion are computed on the backend.
