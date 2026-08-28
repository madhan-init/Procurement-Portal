"""
SIH26032 arrival forecasting service.

Trains at startup on data/arrivals.csv (written by `npm run demo:reset`):
RandomForestRegressor over [day_of_week, week_index, rolling_mean_7, centre_id],
holding out the last 14 days. Reports MAE against a seasonal-naive baseline
(same weekday, previous week) — the honest yardstick for a synthetic dataset.
"""
import math
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

DATA = Path(__file__).parent / "data" / "arrivals.csv"
FEATURES = ["day_of_week", "week_index", "rolling_mean_7", "centre_id"]
HOLDOUT_DAYS = 14
CAPACITY_BUFFER = 1.15

app = FastAPI(title="SIH26032 Arrival Forecast")
state: dict = {}


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["centre_id", "date"]).copy()
    df["day_of_week"] = df["date"].dt.dayofweek
    min_date = df["date"].min()
    df["week_index"] = (df["date"] - min_date).dt.days // 7
    df["rolling_mean_7"] = df.groupby("centre_id")["arrivals"].transform(
        lambda s: s.rolling(7).mean().shift(1)
    )
    df["lag_7"] = df.groupby("centre_id")["arrivals"].shift(7)
    return df


@app.on_event("startup")
def train() -> None:
    if not DATA.exists():
        raise RuntimeError(f"{DATA} not found — run `npm run demo:reset` first")
    raw = pd.read_csv(DATA, parse_dates=["date"])
    df = build_features(raw).dropna(subset=["rolling_mean_7", "lag_7"])

    cutoff = df["date"].max() - pd.Timedelta(days=HOLDOUT_DAYS)
    train_df, test_df = df[df["date"] <= cutoff], df[df["date"] > cutoff]

    model = RandomForestRegressor(n_estimators=200, random_state=26032, n_jobs=-1)
    model.fit(train_df[FEATURES], train_df["arrivals"])

    model_mae = mean_absolute_error(test_df["arrivals"], model.predict(test_df[FEATURES]))
    baseline_mae = mean_absolute_error(test_df["arrivals"], test_df["lag_7"])
    improvement = (1 - model_mae / baseline_mae) * 100 if baseline_mae else 0.0

    state.update(
        model=model,
        raw=raw,
        min_date=raw["date"].min(),
        max_date=raw["date"].max(),
        metrics={
            "model_mae": round(float(model_mae), 2),
            "baseline_mae": round(float(baseline_mae), 2),
            "improvement_pct": round(float(improvement), 1),
            "holdout_days": HOLDOUT_DAYS,
            "trained_rows": int(len(train_df)),
            "baseline": "seasonal-naive (same weekday, previous week)",
        },
    )
    print(
        f"[forecast] trained on {len(train_df)} rows · holdout {HOLDOUT_DAYS}d · "
        f"RandomForest MAE {model_mae:.2f} vs seasonal-naive MAE {baseline_mae:.2f} "
        f"({improvement:.1f}% better)", flush=True
    )


@app.get("/health")
def health():
    return {"status": "ok", "trained": "model" in state}


@app.get("/metrics")
def metrics():
    if "metrics" not in state:
        raise HTTPException(503, "Model not trained")
    return state["metrics"]


@app.get("/forecast")
def forecast(centre_id: int, days: int = 7):
    if "model" not in state:
        raise HTTPException(503, "Model not trained")
    days = max(1, min(days, 30))
    raw: pd.DataFrame = state["raw"]
    centre_hist = raw[raw["centre_id"] == centre_id].sort_values("date")
    if centre_hist.empty:
        raise HTTPException(404, f"No history for centre {centre_id}")

    history = list(centre_hist["arrivals"].astype(float))
    min_date, max_date = state["min_date"], state["max_date"]
    out = []
    for i in range(1, days + 1):
        date = max_date + pd.Timedelta(days=i)
        row = pd.DataFrame(
            [
                {
                    "day_of_week": date.dayofweek,
                    "week_index": (date - min_date).days // 7,
                    "rolling_mean_7": sum(history[-7:]) / 7,
                    "centre_id": centre_id,
                }
            ]
        )
        pred = max(0.0, float(state["model"].predict(row[FEATURES])[0]))
        history.append(pred)
        predicted = round(pred)
        out.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "predicted_arrivals": predicted,
                # spec: suggested = ceil(predicted_arrivals × 1.15) — from the served figure
                "suggested_capacity": math.ceil(predicted * CAPACITY_BUFFER),
            }
        )
    return out
