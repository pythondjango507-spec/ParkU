import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from app.config import PORT, HOST

if __name__ == "__main__":
    print(f"Starting ParkU FastAPI server on http://{HOST}:{PORT}")
    print(f"Interactive API Docs available at http://127.0.0.1:{PORT}/docs")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True, app_dir=backend_dir)

