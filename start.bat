@echo off
REM Starts backend and frontend in two windows. Run setup steps from README first.
start "ReLoop Backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
start "ReLoop Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Backend: http://127.0.0.1:8000/api/health   API docs: http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173
