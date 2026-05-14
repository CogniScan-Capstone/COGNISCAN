"""
Smoke test untuk verifikasi semua dependencies dan setup Supabase.
Run: python test_setup.py
"""
import asyncio
import sys
from urllib.parse import parse_qs, unquote, urlparse


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
        import asyncpg

        def parse_database_url(db_url):
            parsed = urlparse(db_url)
            query = parse_qs(parsed.query)
            database = parsed.path.lstrip("/")
            if not database:
                raise ValueError("database name kosong")

            return {
                "user": unquote(parsed.username or ""),
                "password": unquote(parsed.password or ""),
                "host": parsed.hostname or "",
                "port": parsed.port or 5432,
                "database": database,
                "statement_cache_size": 0 if query.get("pgbouncer") == ["true"] else None,
            }

        async def check_database(label, env_name, required):
            db_url = os.getenv(env_name)
            if not db_url:
                status = "[FAIL]" if required else "[WARN]"
                print(f"  {status} {env_name}: NOT SET")
                return not required

            conn_args = parse_database_url(db_url)
            statement_cache_size = conn_args.pop("statement_cache_size")
            if statement_cache_size is not None:
                conn_args["statement_cache_size"] = statement_cache_size

            print(f"  Connecting via {label}: {conn_args['host']}:{conn_args['port']}/{conn_args['database']}")
            print(f"  User: {conn_args['user']}")

            conn = None
            try:
                conn = await asyncpg.connect(
                    **conn_args,
                    ssl="require",
                    timeout=15,
                )
                version = await conn.fetchval("SELECT version()")
                print(f"  [OK] {label} connected!")
                print(f"       PostgreSQL: {version[:65]}...")
                return True
            except Exception as e:
                status = "[FAIL]" if required else "[WARN]"
                print(f"  {status} {label} connection error: {e}")
                return not required
            finally:
                if conn:
                    await conn.close()

        runtime_ok = await check_database(
            "runtime pooler (DATABASE_URL)",
            "DATABASE_URL",
            required=True,
        )
        if not runtime_ok:
            print(f"\n  Pastikan:")
            print(f"  1. Project Supabase status 'Active' di dashboard")
            print(f"  2. DATABASE_URL pooler benar (biasanya port 6543)")
            print(f"  3. Password di-URL-encode kalau ada special chars")
            print(f"  4. Tidak ada firewall block koneksi Supabase")
            return

        direct_ok = await check_database(
            "direct connection (DATABASE_URL_SYNC)",
            "DATABASE_URL_SYNC",
            required=False,
        )
        if not direct_ok:
            print(f"  [INFO] Runtime backend tetap bisa jalan karena DATABASE_URL pooler berhasil.")
            print(f"         DATABASE_URL_SYNC hanya dibutuhkan untuk direct tools seperti Alembic migrations.")
    except Exception as e:
        print(f"  [FAIL] Database connection error: {e}")
        print(f"\n  Pastikan:")
        print(f"  1. Project Supabase status 'Active' di dashboard")
        print(f"  2. Connection string di .env benar")
        print(f"  3. Password di-URL-encode kalau ada special chars")
        print(f"  4. Tidak ada firewall block koneksi Supabase")
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
