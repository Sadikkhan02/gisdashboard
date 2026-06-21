# Data Collection & Cleaning Guide: Faridabad GIS + D3E Project
**Project Stage:** Phase 1 (MVP Data Pipelines)  
**Target Region:** Faridabad District, Haryana, India  
**Scope:** Spatial & Attribute Data Engineering for Business Location Intelligence MVP ("Where should I open a restaurant?")

---

## 1. Project Vision & Architecture

The Goal of the Decentralized Data Decision Engine (D3E) is to ingest heterogeneous spatial (GIS) and tabular datasets, store them in a spatially-indexed database, and expose an API capable of computing localized **Competition Scores** and **Demographic Viability Indices**.

### Data Pipeline Flow
```
[ OpenStreetMap (Overpass Turbo) ] ───> GeoJSON ───┐
                                                    ├───> [ PostGIS Database ] ───> [ Decision Engine API ]
[ Data.gov.in (Census CSV) ]       ───> CSV     ───┤
[ NCRB / Haryana Police ]          ───> CSV     ───┘
```

---

## 2. Step-by-Step Data Collection Protocol

### Step 2.1: Spatial Infrastructure & Competition Data (OpenStreetMap)
We use the Overpass API via the Overpass Turbo web interface to extract vector primitives (nodes and ways) tagged with specific urban amenities.

1. Navigate to [overpass-turbo.eu](https://overpass-turbo.eu/).
2. In the map viewport search bar (top right), type `Faridabad` to position the bounding box over the target city.
3. Paste the following optimized query into the editor pane. This query establishes an administrative boundary search area for Faridabad and pulls competition points (restaurants, cafes) and infrastructure anchors (schools, hospitals, transit hubs):

```overpass
[out:json][timeout:30];
// Define the administrative boundary relation as the search area
area["name"="Faridabad"]["boundary"="administrative"]->.searchArea;

(
  // Sector 1: Competition Data (Food & Beverage Matrix)
  node["amenity"="restaurant"](area.searchArea);
  way["amenity"="restaurant"](area.searchArea);
  node["amenity"="cafe"](area.searchArea);
  node["amenity"="fast_food"](area.searchArea);
  
  // Sector 2: Demand Anchors & Infrastructure
  node["amenity"="hospital"](area.searchArea);
  way["amenity"="hospital"](area.searchArea);
  node["amenity"="school"](area.searchArea);
  way["amenity"="school"](area.searchArea);
  
  // Sector 3: Transit Ingress/Egress Points
  node["amenity"="bus_station"](area.searchArea);
  node["railway"="station"](area.searchArea);
);

// Output geometries with body details, structural skeleton, and quadtree sorting
out body;
>;
out skel qt;
```

4. Click **Run** on the top menu bar to execute the transaction. Verify visually that spatial geometries render correctly over the Faridabad layout.
5. Click **Export** $\rightarrow$ **Download as GeoJSON**.
6. Save the file locally as `faridabad_poi.geojson`.

### Step 2.2: Road Network Layer Extraction
Because highway and roadway topology features are heavy datasets containing complex multi-point linestrings, they must be extracted in a dedicated session to prevent browser runtime memory exhaustion.

1. Clear the canvas in Overpass Turbo and paste the following query:

```overpass
[out:json][timeout:60];
area["name"="Faridabad"]["boundary"="administrative"]->.searchArea;

(
  // Extract major economic arteries and local connectors
  way["highway"~"primary|secondary|tertiary|residential"](area.searchArea);
);
out body;
>;
out skel qt;
```

2. Execute the query, select **Export**, and choose **Download as GeoJSON**.
3. Save the file locally as `faridabad_roads.geojson`.

### Step 2.3: Demographic & Attribute Ingestion (Census CSV)
Tabular data provides the demographic denominator needed to calculate localized demand densities against your spatial features.

1. Authenticate and log into the **Open Government Data Platform India** (`data.gov.in`).
2. Query for `Primary Census Abstract Haryana 2011` or locate the official `Faridabad District Census Handbook`.
3. Locate the granular structural listings distinguishing between Village, Subdistrict, and District-level aggregates.
4. **Target Dataset Identification:** Select the **FARIDABAD DISTRICT** row (Administrative Tier 1, exhibiting a benchmark Census population profile of **18,09,733**). *Avoid selecting the Subdistrict or standalone Village variants, as their spatial footprints underrepresent the broader GIS vector canvas.*
5. Click **Data in CSV** to initialize download.
6. Save the source archive as `faridabad_population_raw.csv`.

---

## 3. Data Cleaning & Transformation Pipelines

Before streaming these resources into PostGIS, the source data must undergo a schema matching and sanitization process to ensure topological correctness and strict data typing.

### 3.1: Python Data Cleaning Script (`clean_pipeline.py`)
Run the following script locally to structure your tabular demographic data and run automated checks on your spatial payloads.

```python
import pandas as pd
import json

def clean_demographics(input_path, output_path):
    print(f"[*] Initializing cleaning matrix for: {input_path}")
    
    # Ingest raw CSV data
    df = pd.read_csv(input_path)
    
    # Enforce standard formatting for target spatial columns
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
    
    # Filtering down to target administrative metrics for the MVP
    # Ensuring strict numerical types for calculations
    target_columns = ['state', 'district', 'subdistrict', 'town_village', 'population', 'households']
    
    # Standardize data entry types and clear whitespace strings
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].str.strip()
            
    # Save clean structured CSV for PostGIS COPY ingestion
    df.to_csv(output_path, index=False)
    print(f"[+] Cleaned population data saved successfully to: {output_path}")

def validate_geojson(file_path):
    print(f"[*] Auditing GeoJSON integrity for topological errors: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    features = data.get('features', [])
    valid_count = 0
    malformed_count = 0
    
    for feat in features:
        geom = feat.get('geometry')
        if geom and geom.get('coordinates') and geom.get('type'):
            valid_count += 1
        else:
            malformed_count += 1
            
    print(f"[+] Validation Completed. Valid Geometries: {valid_count} | Malformed/Empty: {malformed_count}")

if __name__ == "__main__":
    # Execute Demographic Data Normalization
    clean_demographics("faridabad_population_raw.csv", "faridabad_population_clean.csv")
    
    # Validate Spatial Ingestion Layers
    validate_geojson("faridabad_poi.geojson")
    validate_geojson("faridabad_roads.geojson")
