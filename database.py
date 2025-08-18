from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from typing import Generator
import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

# Read the database URL from the environment
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file")

# Create the engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
