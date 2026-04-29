import os

from utils.env_loader import load_project_env

load_project_env()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import router as auth_router
from routers import admin, bovino, solicitud, transportador, usuario, vehiculo, finca

app = FastAPI(title="TransBovino API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(bovino.router)
app.include_router(usuario.router)
app.include_router(vehiculo.router)
app.include_router(solicitud.router)
app.include_router(transportador.router)
app.include_router(finca.router)
app.include_router(admin.router)


@app.get("/")
def home():
    return {"mensaje": "API funcionando"}