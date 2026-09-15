# 🌍 Nearest City Lookup API (FastAPI + GeoPandas)

This project runs a FastAPI service that efficiently finds the nearest k cities to a given coordinate using a KD-tree built from a GeoJSON dataset of cities.

---

## 🐳 Build and Run with Docker

### 🔨 Build the Docker image:

```bash
docker build . -f Dockerfile -t citydb:latest
```

### 🚀 Run the container:

```bash
docker run -it --rm --name citydb -p 8080:8000 citydb:latest
```

> The `-p 8080:8000` maps port 8000 inside the container (FastAPI default) to your local port 8080.

---

## 🌐 Query the API

### 🔍 Find nearest city by latitude and longitude:

```bash
curl "http://localhost:8080/nearest_city?lat=23.81&lon=90.41" | jq
```

> You can change `lat` and `lon` to any valid coordinates.

---

## 📦 Sample JSON Response

```json
{
  "cities": [
    {
      "city": {
        "scalerank": 3,
        "natscale": 110,
        "labelrank": 6.0,
        "featurecla": "Populated place",
        "name": "Nacala",
        "namepar": "",
        "namealt": "",
        "nameascii": "Nacala",
        "adm0cap": 0,
        "capalt": 0,
        "capin": "",
        "worldcity": 0,
        "megacity": 0,
        "sov0name": "Mozambique",
        "sov_a3": "MOZ",
        "adm0name": "Mozambique",
        "adm0_a3": "MOZ",
        "adm1name": "Nampula",
        "iso_a2": "MZ",
        "note": "",
        "latitude": -14.518611,
        "longitude": 40.715024,
        "pop_max": 224795,
        "pop_min": 199630,
        "pop_other": 195024.0,
        "rank_max": 10,
        "rank_min": 9,
        "meganame": "",
        "ls_name": "Nacala",
        "min_zoom": 5.0,
        "ne_id": 1159150657,
        "lon": 40.715024,
        "lat": -14.518611
      },
      "distance_nm": 46.37142577025217,
      "heading": 157.38,
      "compass": "SE"
    }
  ]
}
```

> `distance_nm` is the straight-line distance (in nautical miles) to the city
> `heading` is the great circle heading from the point to the city
> `compass` is the compass heading (human-friendly)

---

## 🗺️ Web Interface

FastCity includes a polished, interactive web map interface available at the root URL (`/`). 

### Features:
- **Interactive Map**: Built with Leaflet, click anywhere to search for nearby cities.
- **Multiple Basemaps**: Dynamically configurable map selection including standard Tile maps and WMS overlays (e.g., Google Maps, Esri Imagery, NOAA Radar, OpenStreetMap).
- **Dynamic Controls**: Adjust the number of results ($k$) and switch distance units between Nautical Miles, Kilometers, and Miles.
- **Sortable Results**: View results in a table and click headers to sort dynamically.
- **Export**: Export your search results to CSV or JSON formats with the click of a button.

### 🛠️ Map Configuration

The available basemaps and overlays are entirely controlled by the `config.yaml` file located in the project root. You can easily modify, remove, or add new maps without touching any code.

**How to add or modify a map:**
1. Open `config.yaml`
2. Add a new entry to the `maps` array.
3. Specify the `id`, `name`, `type` (`tile` or `wms`), and `url`.
4. Include any necessary `options` (like `maxZoom`, `attribution`, `layers`, `transparent`).

**Example Tile Map:**
```yaml
- id: google_maps
  name: Google Maps
  type: tile
  url: https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}
  options:
    maxZoom: 20
    attribution: '&copy; Google'
```

**Example WMS Overlay:**
```yaml
- id: noaa_nexrad
  name: NOAA NEXRAD Radar
  type: wms
  url: https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi
  options:
    layers: nexrad-n0r-900913
    format: image/png
    transparent: true
    attribution: Weather data &copy; IEM Nexrad
```

*Note: If a WMS layer is marked as `transparent: true`, the application will automatically render a solid basemap (like Esri Topo) underneath it so that the transparent overlay has a visible background.*

---

## 🗺️ Requirements

The city data should be provided in a valid `cities.geojson` file with point geometries. The server projects coordinates to a global metric CRS (e.g., EPSG:4087) for accurate spatial indexing.

---

## 🧰 Technologies Used

- [FastAPI](https://fastapi.tiangolo.com/)
- [GeoPandas](https://geopandas.org/)
- [SciPy](https://scipy.org/) – for `cKDTree` nearest neighbor queries
- [Docker](https://www.docker.com/)
- [Shapely](https://shapely.readthedocs.io/)

---

## 💬 Example (Inside Container)

If you're running inside the Docker container and want to test locally:

```bash
curl "http://localhost:8080/nearest_city?lat=23.81&lon=90.41" | jq
```

---

## 📝 License

MIT or similar – update this section as appropriate.

