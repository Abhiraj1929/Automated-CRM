import csv
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = Workbook()

HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
HEADER_FILL = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
THIN_BORDER = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

FILLS = {
    "b2b": PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid"),
    "real_estate": PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid"),
    "ecommerce": PatternFill(start_color="FFF7ED", end_color="FFF7ED", fill_type="solid"),
    "services": PatternFill(start_color="FDF2F8", end_color="FDF2F8", fill_type="solid"),
    "accounts": PatternFill(start_color="F5F3FF", end_color="F5F3FF", fill_type="solid"),
}

FILES = [
    ("leads_b2b.csv", "B2B SaaS Leads", "b2b"),
    ("leads_real_estate.csv", "Real Estate Leads", "real_estate"),
    ("leads_ecommerce.csv", "E-Commerce Leads", "ecommerce"),
    ("leads_services.csv", "Services Leads", "services"),
    ("accounts.csv", "Accounts", "accounts"),
]

first = True
for filename, sheet_name, fill_key in FILES:
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} - not found")
        continue

    if first:
        ws = wb.active
        ws.title = sheet_name
        first = False
    else:
        ws = wb.create_sheet(title=sheet_name)

    fill = FILLS.get(fill_key, PatternFill())

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row_idx, row in enumerate(reader, 1):
            for col_idx, value in enumerate(row, 1):
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.border = THIN_BORDER
                cell.alignment = Alignment(wrap_text=True)

                if row_idx == 1:
                    cell.font = HEADER_FONT
                    cell.fill = HEADER_FILL
                else:
                    cell.fill = fill
                    # Format revenue columns as currency
                    try:
                        if value and any(k in row[0] if row else "" for k in []) or (col_idx >= 11 and value and row[0] != "name"):
                            pass
                    except:
                        pass
                    cell.value = value

    # Auto-fit column widths
    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            try:
                if cell.value:
                    max_len = max(max_len, len(str(cell.value)))
            except:
                pass
        ws.column_dimensions[col_letter].width = min(max_len + 2, 40)

    print(f"Sheet '{sheet_name}': {ws.max_row - 1} rows")

output_path = os.path.join(os.path.dirname(__file__), "CRM_Test_Data.xlsx")
wb.save(output_path)
print(f"\nExcel saved: {output_path}")
print(f"Sheets: {len(FILES)}")
print(f"Total records: {30*4 + 15} (120 leads + 15 accounts)")
