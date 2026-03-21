"""Database models and session management using SQLAlchemy with SQLite."""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./healthcare.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class PatientRecord(Base):
    __tablename__ = "patient_records"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_address = Column(String, index=True)
    ipfs_hash = Column(String)
    risk_category = Column(String)
    icu_probability = Column(Float)
    age = Column(Integer)
    heart_rate = Column(Integer)
    oxygen_level = Column(Integer)
    temperature = Column(Float)
    symptom_score = Column(Integer)
    file_name = Column(String, nullable=True)
    tx_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AccessLog(Base):
    __tablename__ = "access_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_address = Column(String, index=True)
    doctor_address = Column(String, index=True)
    action = Column(String)  # requested, granted, revoked
    timestamp = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String)
    alert_type = Column(String)  # critical, warning, info
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# Create all tables
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
