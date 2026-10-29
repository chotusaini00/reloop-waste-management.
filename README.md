# ReLoop - Smart Waste Exchange Platform (hackathon MVP)

Suppliers list recyclable waste -> ReLoop finds eligible recyclers -> recyclers request collection -> supplier accepts -> collection completed -> dashboards update.

**Stack:** React + TypeScript + Vite + Tailwind + Recharts | FastAPI + SQLAlchemy + Pydantic | SQLite (`data/reloop.db`, git-ignored)

## Setup on Windows (two terminals)
Requires Python 3.11+ and Node 18+.

**Terminal 1 - backend**
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Tables are created and demo data seeded automatically on first start (never duplicated on restart).

**Terminal 2 - frontend**
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Or run `start.bat` after the one-time installs.

**Verify:** http://127.0.0.1:8000/api/health returns `{"status":"ok"}`; http://127.0.0.1:8000/docs shows the API docs.

## Updating the hero/section photos
Placeholder duotone images are at `frontend/public/images/` (`hero.jpg`, `materials.jpg`, `collection.jpg`, `texture.jpg`). Replace any of them with a real photo of the same filename - no code changes needed, just restart `npm run dev` if it's already running.

## Tests
```
cd backend && pytest -q        # 28 tests: matching engine + full API workflow
cd frontend && npm run build   # type-check + production build
```

## Demo script (8 steps)
1. **Overview** - show live metrics (demo records are tagged "Demo").
2. **Supplier Portal** - type supplier "Your Name Traders", Plastic, 500 kg, Delhi -> Create listing.
3. **Recycler Portal** - register "Your Recycler", Delhi, Plastic, 100-1000 kg.
4. **Marketplace** -> open your listing: see all recyclers scored, with reasons for each exclusion.
5. Switch identity to your recycler -> **Request collection**.
6. Switch identity to your supplier -> **Collection Requests** -> **Accept** (listing becomes Reserved).
7. **Mark completed**.
8. **Environmental Impact** - completed collection weight increases. Settings -> **Reset demo data** to repeat (your records are kept).

Seeded data deliberately includes an excluded-by-city listing (Glass in Delhi) and an excluded-by-quantity one (30 kg organic).

## Matching rules
Eligible only if material accepted AND quantity within [min, max] AND city matches (case/whitespace-insensitive). Score: material 50 + city 20 + quantity 30 (full at range midpoint, 0 at edges). Collection radius is stored but **not** used - matching is city-only.

## Impact methodology
Completed collection weight = sum of listing weights for **completed** requests only. Collected != verified recycled. No emissions factors are configured, so no carbon savings are claimed.

## Limitations / honesty notes
- **No real authentication.** The demo identity selector is not a security boundary (backend still checks ownership of the supplied actor id, but ids are not authenticated). Production needs real auth, authorization, rate limiting, secure hosting, backups, monitoring and a security review.
- Alembic migrations not set up (tables created via `create_all`); to change the schema, delete `data/reloop.db`.
- Frontend uses plain controlled forms with server-side validation (no React Hook Form/Zod/shadcn); no Vitest tests.
- Browser UI was not driven by an automated browser; see verification notes delivered with the project.

## Troubleshooting
- *"Cannot reach the backend"* - start the backend on port 8000.
- *PowerShell blocks venv activation* - `Set-ExecutionPolicy -Scope Process Bypass` then retry.
- *Port in use* - change the port in `vite.config.ts` and CORS origins in `backend/app/main.py`.
- *Corrupt/old DB* - stop backend, delete `data/reloop.db`, restart.
