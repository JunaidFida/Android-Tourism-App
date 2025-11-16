# TouristApp Backend API Documentation

This document describes the REST API exposed by the `TouristApp` FastAPI backend (version 1.0.0). All endpoints are served from the FastAPI application in `app/main.py`.

- **Base URL:** `http://<host>:8000`
- **Interactive Docs:** `GET /docs` (Swagger UI) and `GET /redoc`
- **Authentication:** JSON Web Tokens (JWT) issued by `/auth/login`. Attach tokens via the `Authorization: Bearer <access_token>` header unless the endpoint is explicitly public.
- **Roles:** `tourist`, `travel_company`, `admin`. Role-based access is enforced inside the route handlers.
- **Date/Time:** Unless otherwise specified, ISO 8601 strings are used (e.g. `2025-10-28T12:30:00Z`).
- **Payloads:** Mutating endpoints expect JSON request bodies and return JSON responses; query parameters are used for filtering in `GET` endpoints.

> ⚠️ Known implementation notes:
> - The `/images` endpoints now rely on the async helper `app.database.get_database()`; ensure configuration (e.g. base URL) is provided before production use.
> - Analytics, booking, and recommendation services assume MongoDB documents include the fields described below (e.g. `travel_company_id`, `current_participants`, ISO timestamps).
> - External integrations (real routing, notification delivery, AI model hosting) are stubbed; replace with production services as needed.
---

## Root & Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Basic welcome message.
| `GET` | `/health-check` | Public | Reports API uptime (`{"message": "API is up and running"}`).

---

## Authentication (`/auth`)

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public | JSON body `UserCreate`:<br>`email` (EmailStr), `full_name` (str), `phone_number` (str), `role` (`tourist`\|`travel_company`\|`admin`), `password` (str), optional `preferences`, `profile_picture` | `200 OK` → `UserInDB` JSON with `_id`, `email`, `role`, `hashed_password`, `is_active`, timestamps | Travel companies are created inactive pending admin approval.
| `POST` | `/auth/login` | Public | JSON `{ "email": str, "password": str }` | `200 OK` → `{ "access_token": str, "token_type": "bearer", "user": {"id", "email", "full_name", "role"} }` | Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30).
| `POST` | `/auth/change-password` | Bearer | JSON `{ "old_password": str, "new_password": str }` | `{ "message": "Password changed successfully" }` | User must supply current password.
| `GET` | `/auth/me` | Bearer | — | `UserInDB` | Returns the authenticated user record.

---

## Users (`/users`)

| Method | Path | Auth | Allowed Roles | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/users/{user_id}` | Bearer | Admin or resource owner | Path param: `user_id` | `UserInDB` | 403 if caller is neither admin nor the user themselves.
| `PUT` | `/users/{user_id}` | Bearer | Admin or resource owner | JSON `UserUpdate`: optional `full_name`, `phone_number`, `profile_picture`, `preferences`, `hashed_password` | Updated `UserInDB` | Empty payload rejected (400).
| `POST` | `/users/{user_id}/deactivate` | Bearer | Admin | — | `{ "message": "User account deactivated" }` | Admin cannot deactivate self.
| `POST` | `/users/{user_id}/activate` | Bearer | Admin | — | `{ "message": "User account activated" }` | —
| `GET` | `/users/` | Bearer | Admin | Query: none | `List[UserInDB]` | Placeholder implementation currently returns only the authenticated admin.

**Data Model (User):** See `app/models/user.py` for full schema, including nested `UserPreferences`.

---

## Tour Packages (`/tour-packages`)

| Method | Path | Auth | Roles | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/tour-packages/` | Bearer | `travel_company` | `TourPackageCreate` JSON (title, description, `location{latitude, longitude, address}`, price, duration, group size, etc.) | `TourPackageInDB` | `created_by` must equal caller’s user ID.
| `GET` | `/tour-packages/` | Public | Any | Query params: `skip` (int), `limit` (int), `search` (str), `min_price` (float), `max_price` (float), `duration` (int), `status` (`active`\|`inactive`) | `List[TourPackageInDB]` | Pagination defaults: skip=0, limit=10.
| `GET` | `/tour-packages/{package_id}` | Public | Any | Path param | `TourPackageInDB` | 404 if not found.
| `PUT` | `/tour-packages/{package_id}` | Bearer | Admin or owning `travel_company` | JSON `TourPackageUpdate` (partial fields) | Updated `TourPackageInDB` | Ownership enforced via `created_by` comparison.
| `DELETE` | `/tour-packages/{package_id}` | Bearer | Admin or owning `travel_company` | — | `{ "message": "Tour package deleted successfully" }` | Fails if active bookings (pending/confirmed) exist.
| `GET` | `/tour-packages/company/{company_id}` | Bearer | Admin or owning `travel_company` | Path param | `List[TourPackageInDB]` | Caller must be admin or match `company_id`.

---

## Tourist Spots (`/tourist-spots`)

| Method | Path | Auth | Roles | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/tourist-spots/` | Bearer | Admin | `TouristSpotCreate` JSON (name, description, `location`, region, categories, etc.) | `TouristSpotInDB` | Admin-only creation.
| `GET` | `/tourist-spots/` | Public | Any | Query: `skip`, `limit`, `search`, `region`, `categories[]` | `List[TouristSpotInDB]` | `categories` uses repeated query parameters (`?categories=historical&categories=cultural`).
| `GET` | `/tourist-spots/{spot_id}` | Public | Any | Path param | `TouristSpotInDB` | —
| `PUT` | `/tourist-spots/{spot_id}` | Bearer | Admin | JSON `TouristSpotUpdate` | Updated `TouristSpotInDB` | —
| `DELETE` | `/tourist-spots/{spot_id}` | Bearer | Admin | — | `{ "message": "Tourist spot deleted successfully" }` | —
| `GET` | `/tourist-spots/check-location` | Bearer | Any | Query: `latitude` (float), `longitude` (float), `radius` (int meters, default 100) | If match: `{ "exists": true, "spot": {...}, "all_nearby": [...] }`; else `{ "exists": false }` | Uses geodesic distance across all stored spots.

---

## Bookings (`/bookings`)

| Method | Path | Auth | Roles | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/bookings/` | Bearer | `tourist` | `BookingCreate`: `tour_package_id` (str), `travel_date` (datetime), `number_of_people` (int) | `BookingInDB` | Verifies package exists/active and capacity; auto-calculates price & reference.
| `GET` | `/bookings/` | Bearer | `tourist` | Query: `status` (optional, values: `pending`/`confirmed`/`cancelled`/`completed`) | `List[BookingInDB]` | Only tourists can call this general listing; other roles must use their dedicated endpoints.
| `GET` | `/bookings/{booking_id}` | Bearer | Tourist (own), Travel company (own package), Admin | Path param | `BookingInDB` | Travel-company callers must own the referenced tour package.
| `PUT` | `/bookings/{booking_id}/status` | Bearer | Tourist (self cancel), Travel company (confirm/cancel own package), Admin | JSON `{ "status": "confirmed" }` | `{ "message": "Booking status updated", "booking": BookingInDB }` | Enforces allowed transitions; companies restricted to `confirmed`/`cancelled`.
| `GET` | `/bookings/user` | Bearer | `tourist` | Query: `status` | `List[BookingInDB]` | Convenience alias for the current tourist’s bookings.
| `GET` | `/bookings/company` | Bearer | `travel_company` | Query: `status` | `List[BookingSummary]` (see below) | Returns booking details plus nested `user` and `tour_package` metadata for packages owned by the caller.

`BookingInDB` fields: `id`, `tour_package_id`, `tourist_id`, `booking_date`, `travel_date`, `number_of_people`, `total_price`, `status`, `booking_reference` (all IDs are rendered as strings). `BookingSummary` wraps a `BookingInDB` plus optional nested `user` (`id`, `full_name`, `email`, `phone_number`) and `tour_package` (`id`, `name`, `description`, `price`, `duration_days`, `destinations`).

---

## Ratings (`/ratings`)

| Method | Path | Auth | Roles | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/ratings/` | Bearer | `tourist` | `RatingCreate`: `tour_package_id`, `tourist_id`, `rating` (1-5), optional `review` | `RatingInDB` | Requires completed booking; prevents duplicate ratings per package/user.
| `GET` | `/ratings/package/{package_id}` | Public | Any | Path param | `List[RatingInDB]` | Returns all ratings for package.
| `GET` | `/ratings/user/{user_id}` | Bearer | Admin or owner | Path param | `List[RatingInDB]` | Restricts access for privacy.

---

## Maps & Navigation (`/maps`)

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/maps/distance` | Bearer | JSON `{ "start": {"latitude", "longitude"}, "end": {...} }` | `{ "distance_km": float, "distance_miles": float }` | Uses Haversine calculation.
| `GET` | `/maps/nearby-spots` | Bearer | Query: `latitude`, `longitude`, `radius_km` (float), `limit` (int) | List of spots with added `distance_km` | Returns simple location-based results.
| `POST` | `/maps/route` | Bearer | JSON `RouteRequest`: start/end coordinates, optional `travel_mode` (`driving` default) | Custom route JSON (distance, duration, polyline/steps) | Underlying implementation may be stubbed; errors -> 500.
| `GET` | `/maps/navigation/{spot_id}` | Bearer | Path param, plus query `user_latitude`, `user_longitude`, `travel_mode` | `{ "destination": {...}, "navigation": {...} }` | Fetches spot info + route data.
| `GET` | `/maps/spots-along-route` | Bearer | Query: `start_lat`, `start_lng`, `end_lat`, `end_lng`, `radius_km` | `{ "route": {...}, "spots": [...] }` | Uses midpoint heuristic, not full corridor search.

---

## Recommendations (`/recommendations`)

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/recommendations/spots` | Bearer | Query: `limit` (int, default 10), `use_ai` (bool, default true), optional `latitude`, `longitude` | `{ "user_id": str, "recommendations": [...], "total": int, "ai_powered": bool }` | Uses AI engine (`ai_recommendation_engine`) when `use_ai=true`, else heuristic engine. Recommendations include `recommendation_score`, reasons, optional `distance_km`.
| `GET` | `/recommendations/packages` | Bearer | Query: `limit`, `use_ai` | Same structure | Requires user preferences for best results; falls back to popularity otherwise.
| `GET` | `/recommendations/spots/{spot_id}/similar` | Bearer | Path param, query `limit` | `{ "reference_spot_id": str, "similar_spots": [...], "total": int }` | Returns 404 if no similar spots found.
| `GET` | `/recommendations/trending/spots` | Bearer | Query: `limit` | `{ "trending_spots": [...], "total": int }` | Prefers rating ≥4.0 and at least five ratings.
| `GET` | `/recommendations/for-budget` | Bearer | Query: `max_budget` (float), `limit` | `{ "budget_limit": float, "spot_recommendations": [...], "package_recommendations": [...] }` | Temporarily adjusts user preference budget for this call.
| `GET` | `/recommendations/by-category` | Bearer | Query: `categories[]`, `limit` | `{ "categories": [...], "recommendations": [...], "total": int }` | Temporarily adjusts user preferred categories.
| `POST` | `/recommendations/update-preferences` | Bearer | JSON matching `UserPreferences` schema | `{ "message": "Preferences updated successfully", "preferences": {...} }` | Persists preferences to MongoDB (`users` collection). Invalid structures return 400.

---

## Analytics (`/analytics`)

| Method | Path | Auth | Roles | Query | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/analytics/company/overview` | Bearer | `travel_company` | — | Aggregate metrics (`total_packages`, `active_packages`, bookings, revenue, ratings, conversion) | Depends on package booking/rating data and consistent ISO timestamps.
| `GET` | `/analytics/company/bookings` | Bearer | `travel_company` | `days` (int, default 30) | `{ "period_days", "total_bookings", "status_breakdown", "daily_bookings", "popular_packages", "average_daily_bookings" }` | Uses ISO date comparisons.
| `GET` | `/analytics/company/revenue` | Bearer | `travel_company` | `days` | `{ "period_days", "total_revenue", "average_daily_revenue", "daily_revenue", "revenue_by_package", "total_bookings" }` | Revenue sourced from booking `total_amount`.
| `GET` | `/analytics/company/packages/performance` | Bearer | `travel_company` | — | `{ "total_packages", "package_performance": [...] }` | Includes occupancy, ratings, revenue per package.
| `GET` | `/analytics/admin/system` | Bearer | `admin` | — | System-wide stats (`users`, `packages`, `tourist_spots`, `bookings`, `ratings`, `top_performing_packages`) | Requires admin privileges.

---

## Admin (`/admin`)

| Method | Path | Auth | Roles | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/users` | Bearer | `admin` | Query: `skip`, `limit`, `role`, `is_active`, `search` | `{ "users": [...], "total": int }` | Returns sanitized user summaries.
| `GET` | `/admin/users/{user_id}` | Bearer | `admin` | Path param | Detailed user dict with stats & recent bookings | 404 if user missing.
| `PUT` | `/admin/users/{user_id}/status` | Bearer | `admin` | JSON `{ "is_active": bool }` | `{ "message": "User activated/deactivated successfully" }` | Cannot deactivate own account.
| `PUT` | `/admin/users/{user_id}/role` | Bearer | `admin` | JSON `{ "role": "tourist"|"travel_company"|"admin" }` | `{ "message": "User role updated to ..." }` | Admin cannot change own role.
| `DELETE` | `/admin/users/{user_id}` | Bearer | `admin` | Query `force` (bool, default false) | `{ "message": "User deleted successfully" }` or 400 error with reason | `force=true` removes related bookings/ratings.
| `GET` | `/admin/users/{user_id}/activity` | Bearer | `admin` | Query `days` (int, default 30) | `{ "user_id", "period_days", "bookings_count", "total_spent", "ratings_given", "recent_bookings" }` | 404 if user missing.
| `GET` | `/admin/dashboard` | Bearer | `admin` | — | Dashboard stats (users, bookings, packages, revenue) | Includes weekly deltas.
| `POST` | `/admin/users/{user_id}/send-notification` | Bearer | `admin` | JSON `{...}` arbitrary | Echo `{ "message": "Notification sent successfully", "user_id", "notification" }` | Placeholder for future integration.
| `GET` | `/admin/reports/users` | Bearer | `admin` | Query `format` (default `json`) | Report with role distribution, monthly signups, top active users | Always returns JSON regardless of `format` value.

---

## Images (`/images`)

| Method | Path | Auth | Roles | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/images/process-all-spots` | Bearer | `admin` | — | `{ "message": "Image processing started in background", "status": "processing" }` | Schedules background task (`image_manager.process_all_spots`).
| `POST` | `/images/spots/{spot_id}/download` | Bearer | `admin` or `travel_company` | Query `max_images` (int, default 3) | `{ "message", "images": [paths], "spot_id" }` | Requires valid Mongo ID; updates spot `image_urls` via the async `get_database()` helper.
| `GET` | `/images/serve/{image_path}` | Public | Any | Path parameter capturing relative path | File stream | Serves from `image_manager.base_path`; returns 404 if file absent.
| `DELETE` | `/images/spots/{spot_id}/images/{image_name}` | Bearer | `admin` or `travel_company` | Path params | `{ "message": "Image deleted successfully", "deleted_image": str }` | Removes file and DB reference on success.
| `GET` | `/images/spots/{spot_id}` | Bearer | `admin` or `travel_company` | Path param | `{ "spot_id", "spot_name", "images": [URL], "image_count" }` | Builds URLs using hardcoded base `http://192.168.18.183:8000`—parameterize in config before production use.

---

## Static Files

- Static assets located under `static/` are mounted at `/static`: `GET /static/<path>`.

---

## Common Error Responses

- `401 Unauthorized`: Missing or invalid token. FastAPI returns `{"detail": "Not authenticated"}` or `{"detail": "Could not validate credentials"}`.
- `403 Forbidden`: Authenticated but lacking the required role/ownership.
- `404 Not Found`: Requested resource absent.
- `400 Bad Request`: Validation errors, duplicate entries, illegal state transitions, or domain-specific checks (e.g., booking capacity exceeded, duplicate ratings).
- `500 Internal Server Error`: Unexpected exceptions (e.g., Mongo connection issues, stubbed external integrations).

---

## Data Models Reference (Selected)

### User Models (`app/models/user.py`)
- `UserCreate`: extends `UserBase` (`email`, `full_name`, `phone_number`, `role`, optional `preferences`, `profile_picture`) adding `password`.
- `UserInDB`: includes `_id` alias `id`, `hashed_password`, `is_active`, timestamps.
- `UserPreferences`: `preferred_categories: List[str]`, `budget_range: {min, max}`, `preferred_regions`, `travel_style`, `group_size_preference`.

### Tour Package Models (`app/models/tour_package.py`)
- `TourPackageBase`: stores `name` (accepts API alias `title`), `description`, `location`, `price`, `duration_days`, participant caps (`max_participants`, `current_participants`), `category`, `difficulty_level`, `destinations`, inclusions/exclusions, itinerary days, `image_urls`, `status`, rating counters, `available_dates`, `travel_company_id`, `created_by`, timestamps.
- `TourPackageInDB`: extends base, exposes `_id` as `id` and normalizes legacy documents (ensuring location, status, ownership fields).

### Tourist Spot Models (`app/models/tourist_spot.py`)
- `TouristSpotBase`: `name`, `description`, `location`, `region`, `categories`, optional `image_urls`, `rating`, `entry_fee`, `opening_hours`, `best_time_to_visit`.

### Booking Models (`app/models/booking.py`)
- `BookingCreate`: `tour_package_id`, `travel_date`, `number_of_people`.
- `BookingInDB`: extends `BookingBase` (tour/package IDs, `booking_date`, `travel_date`, `number_of_people`, `total_price`, `status`), adds `id`, `booking_reference`; helper `from_mongo` converts ObjectIds to strings.
- `BookingSummary`: wraps a `BookingInDB` with optional `RelatedUser` and `RelatedTourPackage` snapshots for travel-company dashboards.

### Rating Models (`app/models/rating.py`)
- `RatingCreate`: `tour_package_id`, `tourist_id`, `rating`, optional `review`.

---

## Testing & Utilities

- Unit tests under `tests/` cover auth, bookings, ratings, packages, spots, users.
- Run locally via `uvicorn run.py` (hot reload enabled).
- Environment configuration is read from `.env` (see `app/config.py`).

---

## Outstanding Tasks for Production Hardening

1. Replace undefined `get_database()` calls in `app/routes/images.py` with the existing `get_db()` helper or introduce an async wrapper.
2. Ensure package documents include fields used by analytics & booking services (`name`, `status`, `max_participants`, `current_participants`, `travel_company_id`, `total_amount`). Update models or services for consistency (currently `TourPackageBase` uses `title`, while services expect `name`).
3. Implement missing authorization checks for travel companies in `app/routes/bookings.py` (ownership verification).
4. Externalize hardcoded base URLs (e.g., image serving host) into configuration.
5. Normalize stored timestamps to actual `datetime` objects instead of ISO strings to avoid parsing issues in analytics.

This documentation aggregates all endpoints and expected payloads to simplify integration with the TouristApp backend. Keep it synchronized with runtime changes and regenerated schemas.
