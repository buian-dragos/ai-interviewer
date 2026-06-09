## Supabase API-Centric Architecture
* **Ownership:** FastAPI acts as the exclusive gateway to Supabase. The Next.js frontend must never communicate with Supabase directly.
* **Libraries:** Use `supabase-py` (the official Supabase Python Client) for Auth, Storage, and Edge Functions. For heavy or complex relational database queries, use `SQLAlchemy 2.0` or `asyncpg` via the direct connection string.

## Authentication & Session Flow
* **Endpoints:** Expose `/auth/signup`, `/auth/login`, and `/auth/logout` endpoints from FastAPI. 
* **Backend Delegation:** These endpoints must use the `supabase.auth.sign_in_with_password()` or `sign_up()` methods.
* **Token Management:** Upon successful login, extract the `access_token` (JWT) and `refresh_token` from Supabase's response and return them to Next.js.
* **Route Protection:** Protect your FastAPI routes by reading the incoming `Authorization: Bearer <token>` header and validating it against Supabase via `supabase.auth.get_user(token)`.

## Directory & State Separation
* **Client Initialization:** Initialize a single async Supabase client using a dependency or lifespan pattern (`create_async_client`). Do not recreate the client on every request.
* **Service Layer:** Keep Supabase SDK logic separated from routes. Route files (routers/) handle HTTP request parsing, while service files (services/auth_service.py, services/db_service.py) execute Supabase/Postgres actions.