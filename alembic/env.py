import os
from alembic import context
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig
from database import Base
from models import *

# Alembic config
config = context.config
fileConfig(config.config_file_name)

# Read DATABASE_URL directly from environment
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL environment variable not set")

target_metadata = Base.metadata

def run_migrations_online():
    # Pass the DB URL directly, bypassing configparser
    connectable = engine_from_config(
        {"sqlalchemy.url": db_url},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    raise Exception("Offline mode not supported")
else:
    run_migrations_online()
