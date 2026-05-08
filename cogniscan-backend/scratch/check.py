import sys; sys.path.append('.')
import asyncio
from sqlalchemy import text
from api.core.database import engine

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT column_name FROM information_schema.columns WHERE table_name = ''pengguna'';'))
        print('Columns in pengguna:', [row[0] for row in result])

asyncio.run(check())
