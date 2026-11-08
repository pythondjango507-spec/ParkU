"""
ParkU Database Management & Inspection Tool
Usage:
    venv\\Scripts\\python manage_db.py          (Show summary of all tables)
    venv\\Scripts\\python manage_db.py shell    (Interactive SQL prompt)
    venv\\Scripts\\python manage_db.py "SQL"   (Execute a custom SQL query)
"""

import sys
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "parku.db"

def get_connection():
    if not DB_PATH.exists():
        print(f"[!] Database file does not exist yet at: {DB_PATH}")
        print("    Run the backend once (`python run.py`) to initialize tables.")
        sys.exit(1)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def show_summary():
    conn = get_connection()
    cursor = conn.cursor()

    print("\n" + "=" * 60)
    print(f"  ParkU SQLite Database: {DB_PATH.name}")
    print(f"  Path: {DB_PATH}")
    print("=" * 60)

    tables = ["users", "parking_spots", "bookings"]
    for table in tables:
        try:
            count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"\n[TABLE] {table.upper()} (Total: {count} records)")
            print("-" * 60)
            rows = cursor.execute(f"SELECT * FROM {table} LIMIT 10").fetchall()
            if not rows:
                print("  (Empty - no records yet)")
            else:
                for r in rows:
                    row_dict = dict(r)
                    # Mask password hashes for clean reading
                    if "password_hash" in row_dict:
                        row_dict["password_hash"] = "*** (hashed)"
                    print(" ", row_dict)
        except sqlite3.OperationalError:
            print(f"\n[TABLE] {table.upper()} - Table not found yet")

    print("\n" + "=" * 60 + "\n")
    conn.close()

def run_query(sql):
    conn = get_connection()
    cursor = conn.cursor()
    print(f"\nExecuting: {sql}\n")
    try:
        cursor.execute(sql)
        if sql.strip().upper().startswith("SELECT"):
            rows = cursor.fetchall()
            if not rows:
                print("  (0 rows returned)")
            else:
                for r in rows:
                    print(" ", dict(r))
                print(f"\nTotal: {len(rows)} row(s)")
        else:
            conn.commit()
            print(f"  Query executed successfully. Rows affected: {cursor.rowcount}")
    except Exception as e:
        print(f"[!] Error: {e}")
    finally:
        conn.close()

def interactive_shell():
    conn = get_connection()
    cursor = conn.cursor()
    print("\n" + "=" * 60)
    print("  ParkU SQLite Interactive Console")
    print("  Type your SQL query and press Enter (or 'exit' to quit)")
    print("  Example: SELECT id, name, email, role FROM users;")
    print("=" * 60 + "\n")

    while True:
        try:
            cmd = input("parku-db> ").strip()
            if not cmd:
                continue
            if cmd.lower() in ("exit", "quit", "q"):
                break
            cursor.execute(cmd)
            if cmd.upper().startswith("SELECT") or cmd.upper().startswith("PRAGMA"):
                rows = cursor.fetchall()
                if not rows:
                    print("  (0 rows)")
                else:
                    for r in rows:
                        print(" ", dict(r))
            else:
                conn.commit()
                print(f"  OK ({cursor.rowcount} rows affected)")
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"  Error: {e}")
    conn.close()
    print("\nBye!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1].strip()
        if arg.lower() == "shell":
            interactive_shell()
        else:
            run_query(" ".join(sys.argv[1:]))
    else:
        show_summary()
