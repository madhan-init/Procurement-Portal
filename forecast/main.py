# Ticket 01 stub — full model lands in ticket 07.
from fastapi import FastAPI

app = FastAPI(title="SIH26032 Arrival Forecast")


@app.get("/health")
def health():
    return {"status": "ok"}
