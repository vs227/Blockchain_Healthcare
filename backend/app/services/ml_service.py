"""ML Service - Loads trained models and exposes prediction functions."""
import pickle
import os
import numpy as np
import pandas as pd
from pathlib import Path


class MLService:
    RISK_LABELS = {0: "Low Risk", 1: "Medium Risk", 2: "High Risk"}

    def __init__(self):
        base = Path(__file__).resolve().parent.parent.parent.parent / "ml"
        self.triage_path = base / "triage_model.pkl"
        self.load_path = base / "load_model.pkl"
        self.triage_model = None
        self.load_model = None
        self._load()

    def _load(self):
        try:
            with open(self.triage_path, "rb") as f:
                self.triage_model = pickle.load(f)
            print(f"[ML] Triage model loaded from {self.triage_path}")
        except Exception as e:
            print(f"[ML] WARNING - Could not load triage model: {e}")

        try:
            with open(self.load_path, "rb") as f:
                self.load_model = pickle.load(f)
            print(f"[ML] Load model loaded from {self.load_path}")
        except Exception as e:
            print(f"[ML] WARNING - Could not load load model: {e}")

    def predict_triage(self, vitals: dict) -> dict:
        if self.triage_model is None:
            return self._fallback_triage(vitals)

        # Map dict to DataFrame
        X = pd.DataFrame([[
            vitals.get("age", 45),
            vitals.get("heart_rate", 80),
            vitals.get("oxygen_level", 98),
            vitals.get("temperature", 37.0),
            vitals.get("symptom_score", 1)
        ]], columns=["age", "heart_rate", "oxygen_level", "temperature", "symptom_score"])
        
        pred = int(self.triage_model.predict(X)[0])
        proba = self.triage_model.predict_proba(X)[0]

        return {
            "risk_category": self.RISK_LABELS.get(pred, "Unknown"),
            "risk_level": pred,
            "icu_probability": round(float(proba[2]) if len(proba) > 2 else 0.0, 4),
            "confidence": round(float(max(proba)), 4),
            "probabilities": {
                "low": round(float(proba[0]), 4),
                "medium": round(float(proba[1]) if len(proba) > 1 else 0.0, 4),
                "high": round(float(proba[2]) if len(proba) > 2 else 0.0, 4),
            }
        }

    def _fallback_triage(self, vitals: dict):
        """Rule-based fallback when no model is loaded."""
        hr = vitals.get("heart_rate", 80)
        o2 = vitals.get("oxygen_level", 98)
        temp = vitals.get("temperature", 37.0)
        symptom = vitals.get("symptom_score", 1)
        
        score = (hr / 140) * 0.2 + ((100 - o2) / 15) * 0.4 + ((temp - 36) / 4) * 0.2 + (symptom / 10) * 0.2
        if score < 0.35:
            cat, lvl, icu = "Low Risk", 0, score * 0.1
        elif score < 0.65:
            cat, lvl, icu = "Medium Risk", 1, score * 0.4
        else:
            cat, lvl, icu = "High Risk", 2, min(score * 0.8, 0.99)
        return {"risk_category": cat, "risk_level": lvl, "icu_probability": round(icu, 4),
                "confidence": 0.75, "probabilities": {"low": 0, "medium": 0, "high": 0}}

    def predict_load(self, hour: int, day: int) -> dict:
        if self.load_model is None:
            base = 10 + 20 * np.sin(hour * np.pi / 12)
            return {"predicted_load": int(max(0, base)), "hour": hour, "day": day}

        X = pd.DataFrame([[hour, day]], columns=["hour", "day"])
        pred = self.load_model.predict(X)[0]
        return {"predicted_load": int(max(0, pred)), "hour": hour, "day": day}

    def predict_load_week(self) -> list:
        """Predict load for every hour of the next 7 days."""
        results = []
        for day in range(7):
            day_data = []
            for hour in range(24):
                p = self.predict_load(hour, day)
                day_data.append(p["predicted_load"])
            results.append({"day": day, "hourly_load": day_data,
                            "peak": max(day_data), "average": round(sum(day_data) / 24)})
        return results


ml_service = MLService()
