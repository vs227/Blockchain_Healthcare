import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Create directory for data if not exists
os.makedirs('ml/data', exist_ok=True)

def generate_triage_data(n=1000):
    np.random.seed(42)
    age = np.random.randint(18, 90, n)
    hr = np.random.randint(60, 140, n)
    oxygen = np.random.randint(85, 100, n)
    temp = np.random.uniform(36.0, 40.0, n)
    symptom_score = np.random.randint(1, 10, n)
    
    # Simple logic for risk
    risk_score = (hr / 140) * 0.2 + ( (100 - oxygen) / 15 ) * 0.4 + ( (temp - 36) / 4 ) * 0.2 + (symptom_score / 10) * 0.2
    outcome = []
    for r in risk_score:
        if r < 0.4: outcome.append(0) # Low
        elif r < 0.7: outcome.append(1) # Medium
        else: outcome.append(2) # High
        
    df = pd.DataFrame({
        'age': age,
        'heart_rate': hr,
        'oxygen_level': oxygen,
        'temperature': temp,
        'symptom_score': symptom_score,
        'outcome_label': outcome
    })
    df.to_csv('ml/data/triage_data.csv', index=False)
    return df

def generate_load_data(n=24 * 30):
    np.random.seed(42)
    hours = np.tile(np.arange(24), 30)
    days = np.repeat(np.arange(30), 24) % 7
    
    # Load varies by hour (busy in morning/evening)
    load = 10 + 20 * np.sin(hours * np.pi / 12) + 5 * np.random.randn(len(hours))
    load = np.maximum(load, 0).astype(int)
    
    df = pd.DataFrame({
        'hour': hours,
        'day': days,
        'patient_load': load
    })
    df.to_csv('ml/data/hospital_load.csv', index=False)
    return df

def train_triage_model():
    print("Training Triage Model...")
    df = generate_triage_data()
    X = df.drop('outcome_label', axis=1)
    y = df['outcome_label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    with open('ml/triage_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    print("Triage model saved.")

def train_load_model():
    print("Training Hospital Load Model...")
    df = generate_load_data()
    X = df[['hour', 'day']]
    y = df['patient_load']
    
    model = LinearRegression()
    model.fit(X, y)
    
    with open('ml/load_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    print("Load model saved.")

if __name__ == "__main__":
    train_triage_model()
    train_load_model()
