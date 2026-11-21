# OndaLab

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/juanManuel802/OndaLabb-Music/main/assets/ondalab-hero-dark.svg">
    <img src="https://raw.githubusercontent.com/juanManuel802/OndaLabb-Music/main/assets/ondalab-hero-light.svg" alt="Ondas sonoras animadas" width="720">
  </picture>
</div>

Laboratorio web interactivo para componer ondas, procesarlas por una cadena DSP y visualizar entrada/salida.

## Stack

- **Backend**: Python, FastAPI, NumPy, SciPy
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Motor**: renderizado offline en Python (sin audio en tiempo real)

## Requisitos

- Python 3.11+
- Node.js 20+

## Instalación

```bash
# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Frontend
cd frontend
npm install
```

## Ejecución en desarrollo

En dos terminales:

```bash
# 1) Backend (desde la raíz del repo)
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend
```

```bash
# 2) Frontend
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Abrir `http://127.0.0.1:5173`. Vite proxya `/api` hacia `http://127.0.0.1:8000`.

## Tests y build

```bash
# Backend
source .venv/bin/activate
cd backend
python -m pytest

# Frontend
cd frontend
npm run build
```

## API

- `GET /api/health` — estado del motor.
- `GET /api/capabilities` — fuentes, procesadores, presets y parámetros.
- `POST /api/render` — renderiza `{ patch, sequence, options }` y devuelve análisis.
- `GET /api/render/{render_id}/audio?channel=input|output&download=1` — WAV renderizado.

## Notas

- El estado del proyecto se guarda en `localStorage` y puede exportarse/importarse como JSON.
- Los renders se cachean en memoria por hash de `patch + sequence`.
