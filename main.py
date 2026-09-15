from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import geopandas as gpd
from shapely.geometry import Point
from scipy.spatial import cKDTree
import numpy as np
import math
from contextlib import asynccontextmanager
from typing import List
import yaml

# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------
def initial_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Returns the initial great-circle bearing (degrees, 0 to 360) from (lat1, lon1)
    to (lat2, lon2).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    x = math.sin(delta_lambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - \
        math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    theta = math.degrees(math.atan2(x, y))
    return (theta + 360) % 360  # Normalize to [0, 360)

def compass_direction_8(bearing_deg: float) -> str:
    """
    Converts a bearing to 8-point compass direction (N, NE, E, etc.).
    """
    directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    index = int((bearing_deg + 22.5) // 45) % 8
    return directions[index]

# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------
class CityInfo(BaseModel):
    city: dict
    distance_nm: float
    heading: float
    compass: str = Field(..., description="Compass direction (8-point)")

class CitiesResponse(BaseModel):
    cities: List[CityInfo]

# ---------------------------------------------------------------------------
# FastAPI app & data loading
# ---------------------------------------------------------------------------
# EPSG:4087 – World Equidistant Cylindrical, good for distance approximations everywhere
# EPSG:3857 – Web Mercator (used by web maps), decent approximation but distorts near poles
metric_crs_epsg = 4087

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load and clean city data
    cities_gdf = gpd.read_file("cities.geojson").fillna("")
    cities_gdf = cities_gdf[
        cities_gdf.geometry.notnull() &
        cities_gdf.geometry.is_valid &
        (cities_gdf.geometry.type == "Point")
    ]

    cities_gdf["lon"] = cities_gdf.geometry.x
    cities_gdf["lat"] = cities_gdf.geometry.y
    cities_gdf = cities_gdf[cities_gdf["lat"].notna() & cities_gdf["lon"].notna()]

    if cities_gdf.empty:
        raise RuntimeError("No valid city data found.")

    # Project for distance calculation
    cities_proj = cities_gdf.to_crs(epsg=metric_crs_epsg)
    coords = np.column_stack((cities_proj.geometry.x, cities_proj.geometry.y))
    tree = cKDTree(coords)

    app.state.cities_gdf = cities_gdf
    app.state.cities_proj = cities_proj
    app.state.tree = tree
    yield

app = FastAPI(
    title="Nearest City Lookup",
    description="Finds the nearest city (or cities) and includes distance and direction.",
    lifespan=lifespan,
    docs_url=None,
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="/static/vendor/swagger/swagger-ui-bundle.js",
        swagger_css_url="/static/vendor/swagger/swagger-ui.css",
        swagger_favicon_url="/static/vendor/swagger/favicon-32x32.png",
    )



@app.get("/config")
def get_config():
    try:
        with open("config.yaml", "r") as f:
            config = yaml.safe_load(f)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

# ---------------------------------------------------------------------------
# API endpoint
# ---------------------------------------------------------------------------
@app.get("/nearest_city", response_model=CitiesResponse)
def nearest_city(
    request: Request,
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude of the point"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude of the point"),
    k: int = Query(1, ge=1, description="Number of cities to return"),
    max_distance_nm: float | None = Query(
        None, gt=0.0, description="Maximum distance in nautical miles"
    ),
):
    cities_wgs = request.app.state.cities_gdf
    cities_proj = request.app.state.cities_proj
    tree = request.app.state.tree

    # Convert query point to projected CRS
    point_wgs = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326")
    point_proj = point_wgs.to_crs(epsg=metric_crs_epsg).geometry.iloc[0]
    query_xy = (point_proj.x, point_proj.y)

    # Query k nearest
    dist_m, idx = tree.query(query_xy, k=min(k, len(cities_wgs)))
    dist_m = np.atleast_1d(dist_m)
    idx = np.atleast_1d(idx)

    cities = []
    for d_m, i in zip(dist_m, idx):
        dist_nm = float(d_m) / 1852.0
        if max_distance_nm is not None and dist_nm > max_distance_nm:
            continue

        city_row = cities_wgs.iloc[i]
        bearing = initial_bearing(lat, lon, city_row["lat"], city_row["lon"])
        cities.append(
            CityInfo(
                city=city_row.drop(labels=["geometry"]).to_dict(),
                distance_nm=dist_nm,
                heading=round(bearing, 2),
                compass=compass_direction_8(bearing)
            )
        )

    if not cities:
        raise HTTPException(status_code=404, detail="No city found within range.")

    cities.sort(key=lambda r: r.distance_nm)
    return CitiesResponse(cities=cities)

