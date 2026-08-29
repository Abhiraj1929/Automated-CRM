import csv
import os
import uuid
from datetime import datetime, timedelta

random_ids = {}
def get_uuid(name):
    if name not in random_ids:
        random_ids[name] = str(uuid.uuid4())
    return random_ids[name]

# Demo user IDs
ADMIN_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
SARAH_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901"
MARCUS_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012"
EMILY_ID = "d4e5f6a7-b8c9-0123-defa-234567890123"
OWNERS = [ADMIN_ID, SARAH_ID, MARCUS_ID, EMILY_ID]

sql_lines = []
sql_lines.append("-- ============================================================")
sql_lines.append("-- CRM TEST DATA IMPORT")
sql_lines.append("-- Run this AFTER STEP1 through STEP10")
sql_lines.append("-- ============================================================")
sql_lines.append("")

def esc(val):
    if val is None or val == "None" or val == "":
        return "NULL"
    val = str(val).replace("'", "''")
    return f"'{val}'"

def sql_insert(table, row):
    cols = ", ".join(row.keys())
    vals = ", ".join([esc(v) for v in row.values()])
    return f"INSERT INTO {table} ({cols}) VALUES ({vals});"

# ============================================================
# Read and insert Leads
# ============================================================
LEAD_FILES = [
    ("leads_b2b.csv", "B2B SaaS"),
    ("leads_real_estate.csv", "Real Estate"),
    ("leads_ecommerce.csv", "E-Commerce"),
    ("leads_services.csv", "Services"),
]

lead_count = 0
for filename, vertical in LEAD_FILES:
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(filepath):
        continue
    sql_lines.append(f"-- {vertical} Leads")
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["id"] = str(uuid.uuid4())
            row["lead_score"] = 0
            row["score_category"] = "low"
            row["tags"] = "{}"
            row["updated_at"] = row["created_at"]
            sql_lines.append(sql_insert("leads", row))
            lead_count += 1
    sql_lines.append("")

# ============================================================
# Read and insert Accounts
# ============================================================
account_count = 0
filepath = os.path.join(os.path.dirname(__file__), "accounts.csv")
if os.path.exists(filepath):
    sql_lines.append("-- Accounts")
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["id"] = str(uuid.uuid4())
            row["updated_at"] = row["created_at"]
            sql_lines.append(sql_insert("accounts", row))
            account_count += 1
    sql_lines.append("")

sql_lines.append(f"-- Total: {lead_count} leads, {account_count} accounts")

output = os.path.join(os.path.dirname(__file__), "STEP11_test_data.sql")
with open(output, 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines))

print(f"Generated {output}")
print(f"  Leads: {lead_count}")
print(f"  Accounts: {account_count}")
print(f"  Total INSERT statements: {lead_count + account_count}")
