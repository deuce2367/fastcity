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

