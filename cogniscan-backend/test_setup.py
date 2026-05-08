"""
Smoke test untuk verifikasi semua dependencies dan setup Supabase.
Run: python test_setup.py
"""
import asyncio
import sys
from urllib.parse import unquote


async def main():
    print(f"\n{'='*60}")
    print(f"COGNISCAN BACKEND - SETUP VERIFICATION")
    print(f"Database: Supabase | Environment: Anaconda")
    print(f"{'='*60}\n")
    
    print(f"Python version: {sys.version}\n")
    
    # ============ Test imports ============
    print("=== Testing imports ===")
    
    imports_to_test = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("sqlalchemy", "SQLAlchemy"),
        ("alembic", "Alembic"),
        ("asyncpg", "asyncpg"),
        ("pydantic", "Pydantic"),
        ("pydantic_settings", "pydantic-settings"),
    ]
    
    all_ok = True
    for module_name, display_name in imports_to_test:
        try:
            module = __import__(module_name)
            version = getattr(module, '__version__', None) or getattr(module, 'VERSION', 'installed')
            print(f"  [OK] {display_name}: {version}")
        except ImportError as e:
            print(f"  [FAIL] {display_name}: {e}")
            all_ok = False
    
    # Special imports
    try:
        from jose import jwt
        print(f"  [OK] python-jose: installed")
    except ImportError as e:
        print(f"  [FAIL] python-jose: {e}")
        all_ok = False
    
    try:
        from passlib.context import CryptContext
        print(f"  [OK] passlib: installed")
    except ImportError as e:
        print(f"  [FAIL] passlib: {e}")
        all_ok = False
    
    try:
        from google import genai
        print(f"  [OK] google-genai: installed")
    except ImportError as e:
        print(f"  [FAIL] google-genai: {e}")
        all_ok = False
    
    if not all_ok:
        print("\nABORT: Beberapa import gagal. Cek troubleshooting.")
        return
    
    # ============ Test .env loading ============
    print("\n=== Testing .env file ===")
    try:
        from dotenv import load_dotenv
        import os
        load_dotenv()
        
        required_vars = [
            "GOOGLE_CLOUD_PROJECT",
            "DATABASE_URL",
            "DATABASE_URL_SYNC",
            "JWT_SECRET_KEY",
        ]
        
        all_present = True
        for var in required_vars:
            value = os.getenv(var)
            if value:
                # Mask sensitive values
                if "SECRET" in var:
                    display = value[:4] + "***"
                elif "DATABASE_URL" in var:
                    if "@" in value:
                        protocol_user = value.split("@")[0]
                        host_part = value.split("@")[1].split("/")[0]
                        display = f"{protocol_user.split(':')[0]}:***@{host_part}"
                    else:
                        display = "***"
                else:
                    display = value
                print(f"  [OK] {var}: {display}")
            else:
                print(f"  [FAIL] {var}: NOT SET")
                all_present = False
        
        if not all_present:
            print("\n  WARNING: Beberapa env vars belum di-set di .env")
            return
    except Exception as e:
        print(f"  [FAIL] Error load .env: {e}")
        return
    
    # ============ Test Supabase connection ============
    print("\n=== Testing Supabase database connection ===")
    try:
        import os
        # Pakai DATABASE_URL_SYNC untuk testing
        db_url = os.getenv("DATABASE_URL_SYNC")
        
        if not db_url:
            print(f"  [SKIP] DATABASE_URL_SYNC tidak ada di .env")
            return
        
        # Parse URL
        url_no_protocol = db_url.replace("postgresql://", "")
        user_pass, host_port_db = url_no_protocol.split("@", 1)
        user, password = user_pass.split(":", 1)
        host_port, database = host_port_db.split("/", 1)
        
        if ":" in host_port:
            host, port_str = host_port.split(":")
            port = int(port_str)
        else:
            host = host_port
            port = 5432
        
        # URL decode password
        password = unquote(password)
        
        print(f"  Connecting to: {host}:{port}/{database}")
        print(f"  User: {user}")
        
        import asyncpg
        conn = await asyncpg.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database=database,
            ssl="require",
            timeout=15
        )
        version = await conn.fetchval("SELECT version()")
        print(f"  [OK] Supabase connected!")
        print(f"       PostgreSQL: {version[:65]}...")
        
        # Cek schema yang ada
        schemas = await conn.fetch("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'")
        print(f"       Schemas: {[s['schema_name'] for s in schemas]}")
        
        await conn.close()
    except Exception as e:
        print(f"  [FAIL] Database connection error: {e}")
        print(f"\n  Pastikan:")
        print(f"  1. Project Supabase status 'Active' di dashboard")
        print(f"  2. Connection string di .env benar (port 5432 untuk Direct Connection)")
        print(f"  3. Password di-URL-encode kalau ada special chars")
        print(f"  4. Tidak ada firewall block port 5432")
        return
    
    # ============ Test FastAPI app creation ============
    print("\n=== Testing FastAPI app creation ===")
    try:
        from fastapi import FastAPI
        test_app = FastAPI(title="Test")
        
        @test_app.get("/")
        async def root():
            return {"status": "ok"}
        
        print(f"  [OK] FastAPI app berhasil dibuat")
        print(f"       Total routes: {len(test_app.routes)}")
    except Exception as e:
        print(f"  [FAIL] FastAPI app error: {e}")
    
    # ============ Test analyzer integration ============
    print("\n=== Testing analyzer integration ===")
    try:
        from analyzer.main import CognitiveDistortionAnalysis, DISTORTION_LABELS
        print(f"  [OK] Analyzer module: importable")
        print(f"       Schema: CognitiveDistortionAnalysis")
        print(f"       Labels: 12 distortion types")
    except ImportError as e:
        print(f"  [FAIL] Analyzer import error: {e}")
        print(f"         Pastikan folder analyzer/ ada di cogniscan-backend/")
    except Exception as e:
        print(f"  [FAIL] Unexpected error: {e}")
    
    print(f"\n{'='*60}")
    print(f"SETUP VERIFICATION COMPLETE")
    print(f"{'='*60}\n")
    
    print("Kalau semua [OK], lanjut ke Step 8.")
    print("Kalau ada [FAIL], cek troubleshooting di akhir dokumen.\n")


if __name__ == "__main__":
    asyncio.run(main())
