## Plan: Route type overhaul, movement types, editing, persistence & pin labels

### 1. Rename and redefine route types

Replace the existing "one_way" / "multi_movement" model with two clearly-defined types:

- **two_way** — a single drawn path. Used for both In and Out. Followers see both-direction arrows on the same line (orange for In direction, blue for Out direction).
- **one_way** — two separate paths. Entry path drawn first, then a separate exit path. Followers' In/Out buttons swap between two different polylines.

The existing DB column `route_type` already stores text. We'll:
- Keep storing `"two_way"` / `"one_way"` (re-purposing the old `"two_way"` label which previously existed as legacy).
- Update `normalizeRouteType` in `src/lib/supabase.ts` to coerce any legacy `multi_movement` → `one_way` (so old saved data renders).
- Update toolbar copy: `Two-Way | One-Way` with short helper text explaining each.

### 2. Movement Type is mandatory on every waypoint

Every waypoint (entry and exit, in both Two-Way and One-Way) carries a `t` tag: `"drive"` or `"walk"`.

Toolbar layout (left → right) when not in Edit mode:
```
[Two-Way | One-Way]     (if One-Way) [In | Out]     [Driving | Walking]
```

- Movement Type is always visible and required before the first waypoint can be placed (disable the map click + show a hint until selected; default is unselected).
- Switching Driving ↔ Walking does NOT clear any existing points — both are rendered simultaneously.
- Storage: extend the waypoint object to `{ lat, lng, t: "drive" | "walk" }` in both `waypoints` and `exit_waypoints` JSONB. Existing rows without `t` default to `"drive"` on load.

Rendering rule for the new line drawing (creator + follower):
- Walk segments rendered green, drive segments rendered orange (entry leg) or blue (exit leg) — segment colour combines movement + direction. Implementation: build connected sub-polylines whenever consecutive points share the same `t`.

### 3. Edit mode works on any visible route without selecting leg/movement

When Edit is toggled on:
- Hide the In/Out and Driving/Walking selectors (still keep Two-Way/One-Way label for context).
- Show the edit toolbar: `Erase | Add | Move`.
- All markers on both entry and exit legs become interactive. Click-to-erase, drag-to-move, and click-on-line-to-add work on whichever polyline was clicked — the leg is inferred from the marker / polyline that received the event (already plumbed in `RouteMap` via `editLeg`, we'll switch from a single `editLeg` prop to per-marker leg inference).

### 4. Waypoint coordinate precision fix

Audit save/load path: the multi_movement offset is caused by the `smoothPath` Catmull-Rom interpolation drawing a curve that doesn't pass through the actual marker points. Fix: for the saved route line we'll continue to smooth visually, but place markers on the raw points and ensure save payload uses exact `p.lat`/`p.lng` with no `Number(...)` coercion. Verify no `.toFixed()` truncation exists in either save or load paths (a quick grep — none currently, but confirm).

For multi-movement legacy rows being normalized to one_way: map each `SegmentPoint` into a waypoint with its `t`, no rounding.

### 5. Persistence of "Shared with Me"

Verify the dashboard's Shared-With-Me query reads from the correct table/column and doesn't depend on any localStorage. Most likely cause: the tab filters by a column that doesn't survive normalization (e.g. `route_type IN ('one_way','two_way')`). We'll widen the query to accept legacy values and confirm RLS policies grant SELECT to authenticated users for routes shared with them. No DB migrations required unless a column is missing.

### 6. Pin labels always visible

In `RouteMap.tsx`, change pin label `<Tooltip>` to `permanent` + `direction="top"`. Notes stay as a separate hover/click tooltip below. Labels then render as small dark chips next to every pin marker without hover.

### 7. Files to touch

- `src/lib/supabase.ts` — types: add `t` to waypoint shape, update `RouteType` to `"two_way" | "one_way"`, update `normalizeRouteType`.
- `src/routes/creator.tsx` — toolbar restructure, unified waypoint model with `t` tag, drop separate `mmPoints` state, edit-mode without leg selection, save payload changes.
- `src/components/RouteMap.tsx` — render segments by `t` for both legs, pin label permanent, edit tool inference per marker/polyline.
- `src/routes/route.$token.tsx` — follower: Two-Way renders one path with both-direction arrows; One-Way swaps between entry/exit; segment colours by `t`.
- `src/routes/routes.$id.tsx` — owner view: same rendering rules.
- `src/routes/dashboard.tsx` — verify Shared-With-Me query.

### Open questions

1. **Two-Way + Walking segments**: if Two-Way is "one path used both ways", can a creator mix Driving and Walking segments along that single Two-Way path? (My assumption: yes — segments coloured by movement type, arrows show both directions across the full path.)
2. **Legacy `multi_movement` routes**: coerce to `one_way` on load (treating all points as the entry path)? Or surface a one-time migration notice? My default: silent coerce to `one_way`-entry-only.
3. **Default movement type**: should I default Driving selected so existing users don't see a blocked map, or require an explicit pick on first use? My default: pre-select Driving.

If those assumptions are wrong, tell me which to change and I'll adjust before implementing.