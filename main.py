from fastapi import FastAPI, Query, HTTPException
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import geopandas as gpd
from shapely.geometry import Point
from scipy.spatial import cKDTree
import numpy as np
from contextlib import asynccontextmanager

class CityResponse(BaseModel):
    city: dict
    distance_nm: float

# EPSG:4087 – World Equidistant Cylindrical, good for distance approximations everywhere
# EPSG:3857 – Web Mercator (used by web maps), decent approximation but distorts near poles
metric_crs_epsg = 4087 # Change this to appropriate CRS for your region

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load and prepare city data once during startup
    cities_gdf = gpd.read_file("cities.geojson").fillna('')

    # Drop rows with missing or invalid geometry
    cities_gdf = cities_gdf[cities_gdf.geometry.notnull() & cities_gdf.geometry.is_valid]

    # Filter only points
    cities_gdf = cities_gdf[cities_gdf.geometry.type == "Point"]

    # Remove cities with NaN coordinates
    cities_gdf["x"] = cities_gdf.geometry.x
    cities_gdf["y"] = cities_gdf.geometry.y
    cities_gdf = cities_gdf[cities_gdf["x"].notna() & cities_gdf["y"].notna()]

    if cities_gdf.empty:
        raise RuntimeError("No valid city data found.")

    cities_proj = cities_gdf.to_crs(epsg=metric_crs_epsg)
    coords = np.array([(geom.x, geom.y) for geom in cities_proj.geometry])
    tree = cKDTree(coords)

    # Store in app state
    app.state.cities_gdf = cities_gdf
    app.state.cities_proj = cities_proj
    app.state.tree = tree

    yield  # <-- Lifespan active

    # No teardown needed here, but you could close files/resources

app = FastAPI(title="Nearest City Lookup", lifespan=lifespan)

@app.get("/nearest_city", response_model=CityResponse)
def nearest_city(
    request: Request,
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0)
):
    cities_gdf = request.app.state.cities_gdf
    cities_proj = request.app.state.cities_proj
    tree = request.app.state.tree

    # Project the query point to metric CRS
    point_wgs = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326")
    point_proj = point_wgs.to_crs(epsg=metric_crs_epsg)
    query_coords = (point_proj.geometry.x.values[0], point_proj.geometry.y.values[0])

    dist, idx = tree.query(query_coords)
    city = cities_gdf.iloc[idx]

    return CityResponse(
        city=city.drop('geometry').to_dict(),
        distance_nm=float(dist)/1852
    )

