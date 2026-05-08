import asyncio
from sqlalchemy import text
from api.core.database import engine

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT column_name FROM information_schema.columns WHERE table_name = ''pengguna'';'))
        columns = [row[0] for row in result]
        print('Columns in pengguna:', columns)

asyncio.run(check())
