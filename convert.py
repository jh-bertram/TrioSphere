import pandas as pd
import markdown as md

def split_semicolon(s):
    if not s:
        return []
    return [item.strip() for item in s.split(";") if item.strip()]

# 1. Load the Excel file
df = pd.read_excel(
    'datasets.xlsx',
    engine='openpyxl',
    dtype=str,
    keep_default_na=False
)

# 2. Normalize semicolon fields
# --- ADD 'region' TO THIS SECTION ---
df['categories']    = df['categories'].map(split_semicolon)
df['region']        = df['region'].map(split_semicolon) 
df['tags']          = df['tags'].map(split_semicolon)
df['invisibleTags'] = df['invisibleTags'].map(split_semicolon)

# 3. Convert Markdown in additionalInfo to HTML
def md_to_html(text):
    # Convert Markdown → HTML, then remove newlines for safe JSON embedding
    html = md.markdown(text, extensions=['extra', 'sane_lists'])
    return html.replace('\n', '')

df['additionalInfo'] = df['additionalInfo'].map(md_to_html)

# 4. Enforce column order
# --- ADD 'source' and 'region' TO THE COLUMN LIST ---
cols = [
    'id','name','description','url','categories','source','region', # ADD 'source' HERE
    'type','yearStart','yearEnd','tags','invisibleTags','additionalInfo'
]
df = df[cols]

# 5. Serialize to data.js
with open('data.js', 'w', encoding='utf-8') as f:
    f.write('const DATASETS = ')
    f.write(df.to_json(orient='records', force_ascii=False, indent=2))
    f.write(';\n')
    f.write('window.DATASETS = DATASETS;')

print(f"Generated data.js with {len(df)} records")