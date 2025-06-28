# 🌍 Nearest City Lookup API (FastAPI + GeoPandas)

This project runs a FastAPI service that efficiently finds the nearest city to a given coordinate using a KD-tree built from a GeoJSON dataset of cities.

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
  "city": {
    "scalerank": 6,
    "natscale": 30,
    "labelrank": 2,
    "featurecla": "Populated place",
    "name": "Vilyuysk",
    "namepar": "",
    "namealt": "",
    "nameascii": "Vilyuysk",
    "adm0cap": 0,
    "capalt": 0,
    "capin": "",
    "worldcity": 0,
    "megacity": 0,
    "sov0name": "Russia",
    "sov_a3": "RUS",
    "adm0name": "Russia",
    "adm0_a3": "RUS",
    "adm1name": "Sakha (Yakutia)",
    "iso_a2": "RU",
    "note": "",
    "latitude": 63.755267,
    "longitude": 121.624762,
    "pop_max": 9948,
    "pop_min": 1139,
    "pop_other": 451,
    "rank_max": 5,
    "rank_min": 3,
    "meganame": "",
    "ls_name": "Vilyuysk",
    "min_zoom": 6,
    "ne_id": 1159146727,
    "x": 121.624762,
    "y": 63.755267
  },
  "distance_nm": 73.8647392192252
}

```

> `distance_nm` is the straight-line distance (in nautical miles) to the city.

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

