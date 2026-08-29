import csv
import random
import uuid
from datetime import datetime, timedelta

random.seed(42)

# User IDs from demo data (admin@crm.com)
ADMIN_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
SARAH_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901"
MARCUS_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012"
EMILY_ID = "d4e5f6a7-b8c9-0123-defa-234567890123"

OWNERS = [ADMIN_ID, SARAH_ID, MARCUS_ID, EMILY_ID]

# ============================================================
# B2B SaaS Leads (30)
# ============================================================
B2B_INDUSTRIES = ["technology", "finance", "healthcare", "manufacturing", "retail", "education"]
B2B_SOURCES = ["website", "referral", "social_media", "email_campaign", "paid_ads", "event", "organic"]
B2B_STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"]
B2B_RATINGS = ["hot", "warm", "cold"]
B2B_TITLES = ["CEO", "CTO", "VP Engineering", "Director of IT", "Product Manager", "COO", "CFO", "Head of Operations", "VP Sales", "Engineering Manager"]

B2B_COMPANIES = [
    ("NexaTech Solutions", "technology"), ("Quantum Dynamics", "technology"),
    ("Pinnacle Financial", "finance"), ("Meridian Health Systems", "healthcare"),
    ("Apex Manufacturing", "manufacturing"), ("RetailPro Inc", "retail"),
    ("EduTech Learning", "education"), ("DataSync Corp", "technology"),
    ("Vanguard Analytics", "finance"), ("CareFirst Medical", "healthcare"),
    ("SteelWorks Global", "manufacturing"), ("ShopEasy Retail", "retail"),
    ("LearnWell Academy", "education"), ("CloudNine Software", "technology"),
    ("CapitalEdge Partners", "finance"), ("MedVision Labs", "healthcare"),
    ("Precision Parts Co", "manufacturing"), ("MegaMart chains", "retail"),
    ("BrightMinds University", "education"), ("FusionTech Labs", "technology"),
    ("WealthBridge Capital", "finance"), ("HealthFirst Clinics", "healthcare"),
    ("AutoAssembly Inc", "manufacturing"), ("QuickShip Logistics", "retail"),
    ("SkillUp Training", "education"), ("CyberShield Security", "technology"),
    ("PrimeInvest Group", "finance"), ("Wellness360 Health", "healthcare"),
    ("GreenBuild Construction", "manufacturing"), ("FashionHub Online", "retail"),
]

b2b_leads = []
for i in range(30):
    company, industry = B2B_COMPANIES[i]
    emp = random.choice([10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000])
    rev = emp * random.randint(50000, 200000)
    rating = random.choices(B2B_RATINGS, weights=[0.2, 0.5, 0.3])[0]
    status = random.choices(B2B_STATUSES, weights=[0.25, 0.3, 0.25, 0.1, 0.1])[0]
    days_ago = random.randint(1, 90)
    created = (datetime.now() - timedelta(days=days_ago)).isoformat() + "+00:00"
    fname = ["James", "Maria", "Robert", "Linda", "David", "Jennifer", "Michael", "Patricia", "William", "Elizabeth",
             "Richard", "Barbara", "Joseph", "Susan", "Thomas", "Jessica", "Charles", "Sarah", "Daniel", "Karen",
             "Matthew", "Nancy", "Anthony", "Lisa", "Mark", "Betty", "Donald", "Margaret", "Steven", "Sandra"][i]
    lname = ["Anderson", "Martinez", "Thompson", "Garcia", "Wilson", "Chen", "Brown", "Davis", "Miller", "Moore",
             "Taylor", "Jackson", "White", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young", "King",
             "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Nelson", "Carter", "Mitchell"][i]
    email_domain = company.lower().replace(" ", "").replace(",", "")[:12] + ".com"
    b2b_leads.append({
        "first_name": fname, "last_name": lname,
        "email": f"{fname.lower()}.{lname.lower()}@{email_domain}",
        "phone": f"+1-555-{random.randint(100,999)}-{random.randint(1000,9999)}",
        "company": company, "title": random.choice(B2B_TITLES),
        "industry": industry, "source": random.choice(B2B_SOURCES),
        "status": status, "rating": rating,
        "annual_revenue": rev, "number_of_employees": emp,
        "website": f"https://www.{email_domain}",
        "description": f"{company} - {industry} company with {emp} employees",
        "owner_id": random.choice(OWNERS), "created_by": ADMIN_ID,
        "created_at": created,
    })

# ============================================================
# Real Estate Leads (30)
# ============================================================
RE_STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"]
RE_RATINGS = ["hot", "warm", "cold"]
RE_SOURCES = ["zillow", "realtor_com", "referral", "open_house", "social_media", "website", "agent_network"]
RE_TYPES = ["single_family", "condo", "townhouse", "multi_family", "commercial"]
RE_LOCATIONS = ["Downtown Manhattan", "Brooklyn Heights", "Westchester County", "Long Island", "Hoboken NJ",
                "Greenwich CT", "Scarsdale NY", "Rye NY", "White Plains", "New Rochelle"]

re_leads = []
re_first = ["Alice", "Bob", "Catherine", "Derek", "Emma", "Frank", "Grace", "Henry", "Isabel", "Jack",
            "Karen", "Leo", "Mia", "Noah", "Olivia", "Paul", "Quinn", "Rachel", "Sam", "Tina",
            "Uma", "Victor", "Wendy", "Xavier", "Yolanda", "Zach", "Amanda", "Brian", "Chloe", "Derek"]
re_last = ["Richardson", "Foster", "Whitaker", "Chambers", "Patterson", "Hawkins", "Bradley", "Dixon",
           "Harper", "Stone", "Warren", "Ford", "Mason", "Grant", "Sullivan", "Crawford", "Spencer",
           "Russell", "Palmer", "Curtis", "Perkins", "Long", "Reed", "Murray", "Bell", "Bailey",
           "Cooper", "Ward", "Fisher", "Lawson"]

for i in range(30):
    budget = random.randint(150000, 1500000)
    property_type = random.choice(RE_TYPES)
    location = random.choice(RE_LOCATIONS)
    tours = random.randint(0, 8)
    views = random.randint(5, 100)
    pre_approved = random.choice([True, False])
    days_since = random.randint(1, 120)
    created = (datetime.now() - timedelta(days=days_since)).isoformat() + "+00:00"
    status = random.choices(RE_STATUSES, weights=[0.3, 0.3, 0.2, 0.1, 0.1])[0]
    rating = random.choices(RE_RATINGS, weights=[0.25, 0.45, 0.3])[0]
    re_leads.append({
        "first_name": re_first[i], "last_name": re_last[i],
        "email": f"{re_first[i].lower()}.{re_last[i].lower()}@{'gmail' if random.random() > 0.4 else 'yahoo'}.com",
        "phone": f"+1-555-{random.randint(100,999)}-{random.randint(1000,9999)}",
        "company": f"{property_type.replace('_', ' ').title()} - {location}",
        "title": "Home Buyer",
        "industry": "real_estate",
        "source": random.choice(RE_SOURCES),
        "status": status, "rating": rating,
        "annual_revenue": None, "number_of_employees": None,
        "website": None,
        "description": f"Budget: ${budget:,} | Type: {property_type} | Location: {location} | Tours: {tours} | Views: {views} | Pre-approved: {pre_approved}",
        "owner_id": random.choice(OWNERS), "created_by": ADMIN_ID,
        "created_at": created,
    })

# ============================================================
# E-Commerce Leads (30)
# ============================================================
EC_STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"]
EC_RATINGS = ["hot", "warm", "cold"]
EC_SOURCES = ["organic_search", "paid_ads", "social_media", "email", "referral", "direct", "affiliate"]

ec_first = ["Alex", "Bella", "Carlos", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ivan", "Julia",
            "Kevin", "Luna", "Marcus", "Nina", "Oscar", "Piper", "Quentin", "Rose", "Steve", "Tara",
            "Ulrich", "Vera", "Wesley", "Xena", "Yuri", "Zara", "Adrian", "Bianca", "Derek", "Elena"]
ec_last = ["Bennett", "Cruz", "Doyle", "Ellis", "Frost", "Gill", "Hicks", "Ingram",
           "Jensen", "Knapp", "Lane", "May", "Nash", "Obrien", "Park", "Quinn",
           "Reeves", "Shaw", "Thorn", "Underwood", "Vaughn", "West", "Xu", "York",
           "Zhang", "Alvarez", "Boyd", "Chang", "Dunn", "Edwards"]

ec_leads = []
for i in range(30):
    cart_value = round(random.uniform(15, 500), 2)
    items = random.randint(1, 15)
    orders = random.randint(0, 20)
    avg_order = round(random.uniform(20, 200), 2)
    loyalty = random.choice([True, False])
    abandoned = random.choice([True, False])
    days_since = random.randint(0, 60)
    created = (datetime.now() - timedelta(days=days_since)).isoformat() + "+00:00"
    status = random.choices(EC_STATUSES, weights=[0.25, 0.3, 0.2, 0.15, 0.1])[0]
    rating = random.choices(EC_RATINGS, weights=[0.2, 0.5, 0.3])[0]
    ec_leads.append({
        "first_name": ec_first[i], "last_name": ec_last[i],
        "email": f"{ec_first[i].lower()}.{ec_last[i].lower()}@{'outlook' if random.random() > 0.5 else 'gmail'}.com",
        "phone": f"+1-555-{random.randint(100,999)}-{random.randint(1000,9999)}",
        "company": f"Online Shopper #{random.randint(1000,9999)}",
        "title": "Customer",
        "industry": "ecommerce",
        "source": random.choice(EC_SOURCES),
        "status": status, "rating": rating,
        "annual_revenue": round(avg_order * orders, 2) if orders > 0 else None,
        "number_of_employees": None,
        "website": None,
        "description": f"Cart: ${cart_value} | Items: {items} | Past Orders: {orders} | Avg Order: ${avg_order} | Loyalty: {loyalty} | Abandoned: {abandoned}",
        "owner_id": random.choice(OWNERS), "created_by": ADMIN_ID,
        "created_at": created,
    })

# ============================================================
# Professional Services Leads (30)
# ============================================================
PS_STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"]
PS_RATINGS = ["hot", "warm", "cold"]
PS_SOURCES = ["website", "referral", "linkedin", "conference", "content_marketing", "partner", "cold_outreach"]
PS_SERVICES = ["consulting", "development", "design", "marketing", "analytics"]
PS_URGENCY = ["immediate", "within_month", "within_quarter", "exploring", "undefined"]

ps_first = ["Ava", "Brandon", "Chloe", "Derek", "Ella", "Finn", "Greta", "Hugo",
            "Iris", "Jake", "Kira", "Liam", "Maya", "Nathan", "Olive", "Peter",
            "Rita", "Sean", "Tess", "Uri", "Violet", "Will", "Xander", "Yara",
            "Zane", "Aria", "Blake", "Cora", "Damon", "Eden"]
ps_last = ["Mitchell", "Owens", "Pierce", "Reed", "Sterling", "Tate", "Vargas",
           "Walsh", "York", "Zimmerman", "Ash", "Banks", "Cole", "Dean", "Faulkner",
           "Greer", "Hayes", "Ivan", "Jordan", "Keith", "Lambert", "Marshall",
           "Nolan", "Osborne", "Perry", "Quinn", "Ray", "Stone", "Turner", "Vaughn"]

ps_leads = []
for i in range(30):
    budget = random.randint(5000, 200000)
    urgency = random.choice(PS_URGENCY)
    consultation = random.choice([True, False])
    days_since = random.randint(1, 150)
    created = (datetime.now() - timedelta(days=days_since)).isoformat() + "+00:00"
    status = random.choices(PS_STATUSES, weights=[0.3, 0.3, 0.2, 0.1, 0.1])[0]
    rating = random.choices(PS_RATINGS, weights=[0.2, 0.5, 0.3])[0]
    ps_leads.append({
        "first_name": ps_first[i], "last_name": ps_last[i],
        "email": f"{ps_first[i].lower()}.{ps_last[i].lower()}@{'company' if random.random() > 0.3 else 'corp'}.com",
        "phone": f"+1-555-{random.randint(100,999)}-{random.randint(1000,9999)}",
        "company": f"{ps_last[i]} & Associates",
        "title": random.choice(["CEO", "Director", "VP", "Manager", "Founder"]),
        "industry": "services",
        "source": random.choice(PS_SOURCES),
        "status": status, "rating": rating,
        "annual_revenue": budget * 3,
        "number_of_employees": random.randint(5, 500),
        "website": f"https://www.{ps_last[i].lower()}assoc.com",
        "description": f"Budget: ${budget:,} | Service: {random.choice(PS_SERVICES)} | Urgency: {urgency} | Consultation: {consultation}",
        "owner_id": random.choice(OWNERS), "created_by": ADMIN_ID,
        "created_at": created,
    })

# ============================================================
# Accounts (15)
# ============================================================
accounts = []
for i in range(15):
    leads = [b2b_leads, re_leads, ec_leads, ps_leads]
    lead = random.choice(leads[i % 4])
    company_name = lead["company"]
    days_ago = random.randint(10, 120)
    created = (datetime.now() - timedelta(days=days_ago)).isoformat() + "+00:00"
    accounts.append({
        "name": company_name,
        "industry": lead["industry"],
        "website": lead.get("website") or f"https://www.{company_name.lower().replace(' ', '')}.com",
        "phone": lead["phone"],
        "email": lead["email"],
        "billing_address": f"{random.randint(100, 9999)} {random.choice(['Main', 'Oak', 'Pine', 'Maple'])} St",
        "shipping_address": f"{random.randint(100, 9999)} {random.choice(['Main', 'Oak', 'Pine', 'Maple'])} St",
        "city": random.choice(["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Seattle", "Denver"]),
        "state": random.choice(["NY", "CA", "IL", "TX", "AZ", "WA", "CO"]),
        "country": "USA",
        "postal_code": f"{random.randint(10000, 99999)}",
        "annual_revenue": lead.get("annual_revenue"),
        "number_of_employees": lead.get("number_of_employees"),
        "description": f"Account for {company_name}",
        "owner_id": random.choice(OWNERS),
        "created_by": ADMIN_ID,
        "created_at": created,
    })

# ============================================================
# Write CSV files
# ============================================================
LEAD_FIELDS = ["first_name", "last_name", "email", "phone", "company", "title", "industry", "source",
               "status", "rating", "annual_revenue", "number_of_employees", "website", "description",
               "owner_id", "created_by", "created_at"]

ACCOUNT_FIELDS = ["name", "industry", "website", "phone", "email", "billing_address", "shipping_address",
                  "city", "state", "country", "postal_code", "annual_revenue", "number_of_employees",
                  "description", "owner_id", "created_by", "created_at"]

def write_csv(filename, fields, rows):
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Written {len(rows)} rows to {filename}")

write_csv("D:\\crm\\ai-crm-project\\test-data\\leads_b2b.csv", LEAD_FIELDS, b2b_leads)
write_csv("D:\\crm\\ai-crm-project\\test-data\\leads_real_estate.csv", LEAD_FIELDS, re_leads)
write_csv("D:\\crm\\ai-crm-project\\test-data\\leads_ecommerce.csv", LEAD_FIELDS, ec_leads)
write_csv("D:\\crm\\ai-crm-project\\test-data\\leads_services.csv", LEAD_FIELDS, ps_leads)
write_csv("D:\\crm\\ai-crm-project\\test-data\\accounts.csv", ACCOUNT_FIELDS, accounts)
