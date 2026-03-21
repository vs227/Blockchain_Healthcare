import json
import os
import pickle
from datetime import datetime
from typing import List, Dict, Any

class AnalyticsService:
    def __init__(self, db_path: str = "data/clinical_analytics.json"):
        self.db_path = db_path
        self.triage_model: Any = None
        self.load_model: Any = None
        self._ensure_db()
        self._load_models()

    def _ensure_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        if not os.path.exists(self.db_path):
            with open(self.db_path, "w") as f:
                json.dump([], f)

    def _load_models(self):
        """Load pre-trained ML models from the ml/ directory."""
        try:
            # Check if paths exist first to avoid noisy errors
            if os.path.exists('ml/triage_model.pkl'):
                with open('ml/triage_model.pkl', 'rb') as f:
                    self.triage_model = pickle.load(f)
            if os.path.exists('ml/load_model.pkl'):
                with open('ml/load_model.pkl', 'rb') as f:
                    self.load_model = pickle.load(f)
        except Exception as e:
            print(f"[ANALYTICS] AI Model load failed: {e}")

    def _load_records(self) -> List[Dict[str, Any]]:
        """Safely load records from the local JSON warehouse."""
        try:
            with open(self.db_path, "r") as f:
                return json.load(f)
        except:
            return []

    def log_metric(self, vitals: Dict[str, Any]):
        """Log anonymized data for hospital intelligence."""
        def safe_int(val, default):
            try: return int(val) if val else default
            except: return default
        def safe_float(val, default):
            try: return float(val) if val else default
            except: return default

        anonymized = {
            "timestamp": datetime.utcnow().isoformat(),
            "age": safe_int(vitals.get("age"), 30),
            "gender": vitals.get("gender"),
            "hr": safe_int(vitals.get("hr"), 75),
            "bp": vitals.get("bp"),
            "o2": safe_int(vitals.get("o2"), 98),
            "temp": safe_float(vitals.get("temp"), 37.0),
            "diagnosis": vitals.get("diagnosis"),
            "medications": vitals.get("medications", ""),
            "triage_score": self._calculate_real_triage(vitals)
        }
        
        try:
            data = self._load_records()
            data.append(anonymized)
            with open(self.db_path, "w") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"[ANALYTICS] Failed to log metric: {e}")

    def _calculate_real_triage(self, v: Dict[str, Any]) -> int:
        """Use the Random Forest model to predict triage level (0-2)."""
        def safe_int(val, default):
            try: return int(val) if val else default
            except: return default
        def safe_float(val, default):
            try: return float(val) if val else default
            except: return default

        # Features: age, heart_rate, oxygen_level, temperature, symptom_score(mocked)
        features = [[
            safe_int(v.get("age"), 30),
            safe_int(v.get("hr"), 75),
            safe_int(v.get("o2"), 98),
            safe_float(v.get("temp"), 37.0),
            5 # Mock symptom score
        ]]

        if self.triage_model is None:
            # Fallback
            score = 3
            if features[0][1] > 100 or features[0][2] < 92: score = 5
            return score
        
        try:
            # Features: [age, hr, o2, temp, symptom_score]
            prediction = self.triage_model.predict(features)[0]
            return [2, 3, 5][prediction] # Map to UI priority
        except Exception as e:
            print(f"[ANALYTICS] Triage model prediction failed: {e}")
            return [2, 3, 5][0] # Fallback to stable priority

    def get_hospital_stats(self):
        """Generate data for Admin Dashboard."""
        try:
            with open(self.db_path, "r") as f:
                records = json.load(f)
        except:
            records = []

    def get_hospital_stats(self):
        """Generate data for Admin Dashboard."""
        def safe_int(val, default):
            try:
                if val is None or val == "": return default
                return int(val)
            except: return default
            
        def safe_float(val, default):
            try:
                if val is None or val == "": return default
                return float(val)
            except: return default

        records = self._load_records()
        safe_records: List[Dict[str, Any]] = list(records) if isinstance(records, list) else []
        
        # Risk Stratification
        risk_counts = {"Critical": 0, "Urgent": 0, "Stable": 0}
        for r in safe_records:
            score = safe_int(r.get("triage_score"), 3)
            if score >= 5: risk_counts["Critical"] += 1
            elif score >= 3: risk_counts["Urgent"] += 1
            else: risk_counts["Stable"] += 1
            
        # Vitals Distribution
        count = max(1, len(safe_records))
        vitals_dist = [
            {"name": "Heart Rate", "value": (sum([safe_int(r.get("hr"), 75) for r in safe_records]) / count)},
            {"name": "SpO2 %", "value": (sum([safe_int(r.get("o2"), 98) for r in safe_records]) / count)},
            {"name": "Temperature", "value": (sum([safe_float(r.get("temp"), 37.0) for r in safe_records]) / count)},
        ]

        # Aggregate Vitals Summary
        triage_trend = []
        for h in range(24):
            hr_recs = [r for r in safe_records if datetime.fromisoformat(r['timestamp'].replace('Z', '+00:00')).hour == h]
            avg_score = 3.0
            if hr_recs:
                avg_score = round(sum([safe_int(r.get("triage_score"), 0) for r in hr_recs]) / len(hr_recs), 2)
            triage_trend.append({"hour": f"{h:02d}:00", "avg_score": avg_score})

        # Aggregate Vitals Summary
        stats = {
            "summary": {
                "total_patients": len(safe_records),
                "bed_occupancy": min(100, int(len(safe_records) * 8.5)), # Mock logic
                "avg_hr": round(sum([safe_int(r.get('hr'), 75) for r in safe_records]) / count, 2),
                "avg_o2": round(sum([safe_int(r.get('o2'), 98) for r in safe_records]) / count, 2)
            },
            "hourly_trend": [
                {"hour": "08:00", "patients": 40},
                {"hour": "12:00", "patients": 105},
                {"hour": "16:00", "patients": 90},
                {"hour": "20:00", "patients": 50},
                {"hour": "00:00", "patients": 30}
            ],
            "risk_distribution": [
                {"name": "Critical Risk", "value": risk_counts["Critical"], "color": "#dc2626"},
                {"name": "Urgent Care", "value": risk_counts["Urgent"], "color": "#f59e0b"},
                {"name": "Stable / Low", "value": risk_counts["Stable"], "color": "#10b981"}
            ],
            "vitals_distribution": [
                {"name": "Heart Rate", "value": (sum([safe_int(r.get("hr"), 75) for r in safe_records]) / count), "color": "#dc2626"},
                {"name": "SpO2 %", "value": (sum([safe_int(r.get("o2"), 98) for r in safe_records]) / count), "color": "#0891b2"},
                {"name": "Temperature", "value": (sum([safe_float(r.get("temp"), 37.0) for r in safe_records]) / count), "color": "#eab308"},
            ],
            "vitals_correlation": [
                {"hr": safe_int(r.get("hr"), 75), "o2": safe_int(r.get("o2"), 98), "age": safe_int(r.get("age"), 30)} 
                for r in safe_records[-50:]
            ],
            "dept_activity": [
                {"subject": "ER", "A": 120, "B": 110, "fullMark": 150},
                {"subject": "ICU", "A": 98, "B": 130, "fullMark": 150},
                {"subject": "OPD", "A": 86, "B": 130, "fullMark": 150},
                {"subject": "Labs", "A": 99, "B": 100, "fullMark": 150},
                {"subject": "Pharmacy", "A": 85, "B": 90, "fullMark": 150}
            ],
            "triage_trend": triage_trend,
            "recent_entries": safe_records[max(0, len(safe_records)-10):] if safe_records else [],
            "predictions": self._generate_predictions(safe_records)
        }
        return stats

    def _generate_predictions(self, records):
        """Use load_model if available, else return educated guesses."""
        if not self.load_model:
            return {
                "peak_load_estimate": "12:00 - 16:00 (Est)",
                "required_staff_increase": "10%",
                "high_risk_alerts": len([r for r in records if r.get("triage_score", 0) >= 4]),
                "recommendation": "Maintain standard staffing protocols."
            }
        
        try:
            # Predict load for next hour
            now = datetime.utcnow()
            next_hour = (now.hour + 1) % 24
            day_of_week = now.weekday()
            pred_load = self.load_model.predict([[next_hour, day_of_week]])[0]
            
            return {
                "peak_load_estimate": f"{next_hour:02d}:00",
                "required_staff_increase": f"{max(0, int(pred_load - 5))}%",
                "high_risk_alerts": len([r for r in records if r.get("triage_score", 0) >= 4]),
                "recommendation": f"Forecasted load {int(pred_load)} patients. Adjust staffing accordingly."
            }
        except:
            return {"recommendation": "Awaiting model synchronization..."}

analytics_service = AnalyticsService()
