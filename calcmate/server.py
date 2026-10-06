from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from calcmate.attempt_store import AttemptStore
from calcmate.knowledge_graph import PROJECT_ROOT
from calcmate.pipeline import CalcMatePipeline
from dotenv import load_dotenv

load_dotenv()


app = FastAPI(title="CalcMate")
pipeline: CalcMatePipeline | None = None
attempt_store = AttemptStore()

# Serve the React build when it exists, else the original plain-HTML page.
# `npm run build` in frontend/ produces frontend/dist; until then the legacy
# web/ directory keeps the app runnable with no Node toolchain installed.
REACT_DIST = PROJECT_ROOT / "frontend" / "dist"
LEGACY_WEB = PROJECT_ROOT / "web"
web_dir = REACT_DIST if (REACT_DIST / "index.html").exists() else LEGACY_WEB

app.mount("/static", StaticFiles(directory=LEGACY_WEB), name="static")
if (REACT_DIST / "assets").is_dir():
    # Vite emits hashed bundles under /assets and references them absolutely.
    app.mount("/assets", StaticFiles(directory=REACT_DIST / "assets"), name="assets")


class SolveRequest(BaseModel):
    text: str #problem text
    overlay_id: str = "ncert" #edtech platform
    correct: bool = True #doubt


@app.get("/")
def index() -> FileResponse:
    return FileResponse(web_dir / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

#wen i click solve button this is the endpoint i reach
@app.post("/api/solve")
def solve(request: SolveRequest) -> dict:
    global pipeline
    try:
        if pipeline is None:
            pipeline = CalcMatePipeline()
        solution = pipeline.solve(request.text, request.overlay_id)#passing the problem and the solvingtype expected
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    attempt = attempt_store.record(
        request.text,
        request.overlay_id,
        solution.law_nodes,
        solution.applied_constraints,
        solution.was_under_constrained,
        solution.was_contradiction,
        request.correct,
    )
    payload = solution.to_jsonable()
    payload["attempt_id"] = attempt.id
    return payload


@app.get("/api/weak-nodes")
def weak_nodes() -> list[dict]:
    return attempt_store.weak_nodes()


# Must be declared LAST: FastAPI matches routes in definition order, so an
# earlier catch-all would swallow every /api/* request above.
@app.get("/{full_path:path}")
def spa_fallback(full_path: str) -> FileResponse:
    """Serve the SPA for client-side routes like /dashboard and /solve.

    React Router owns those paths in the browser, but a refresh or a pasted
    link asks the server for them directly. Any non-API path that is not a
    real file on disk returns index.html and lets the router take over.
    """
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    candidate = web_dir / full_path
    if full_path and candidate.is_file():
        return FileResponse(candidate)

    return FileResponse(web_dir / "index.html")
