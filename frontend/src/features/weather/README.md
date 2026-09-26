# Frontend Feature: Weather

**Owner:** TBD
**Status:** Not implemented

Renders the weather module in both compact and expanded form, and displays the grounded
clothing and essentials suggestions returned by the backend.

Expansion is driven by a typed UI event, not by string matching spoken phrases. This module
owns the expansion and fade animation; the assistant only requests it.

Suggestions displayed here must come from the fetched forecast and event context. Never render
invented conditions. Fixture-sourced data must be visibly labeled.

## Planned future files

Compact tile, expanded view, and the presentation of clothing/packing recommendations.

## Does NOT own

Weather provider requests, API credentials, or recommendation logic that belongs to the
backend weather feature.
