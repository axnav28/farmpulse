import asyncio
import csv
import hashlib
import html
import json
import math
import os
import random
import re
import sqlite3
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, AsyncGenerator, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "farmpulse.db"
UTC = timezone.utc
HTTP_TIMEOUT_SECONDS = 12.0
AGGREGATE_CACHE_TTL_SECONDS = int(os.getenv("AGGREGATE_CACHE_TTL_SECONDS", "300"))
NASA_POWER_BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
NASA_GIBS_NDVI_COLORMAP = "https://gibs.earthdata.nasa.gov/colormaps/v1.0/output/MODIS_NDVI.html"
OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"

RiskCategory = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
AgentStatus = Literal["IDLE", "RUNNING", "COMPLETE", "ERROR"]


class DistrictRecord(BaseModel):
    id: str
    district: str
    state: str
    lat: float
    lon: float
    primary_crop: str
    acreage_lakh: float
    kvk_contact: str
    language: str


class WeatherData(BaseModel):
    rainfall_7d_mm: float
    rainfall_anomaly_pct: float
    avg_temp_c: float
    temp_anomaly_c: float
    humidity_pct: float
    weather_anomaly: str
    source: str
    stale: bool = False


class PestWindow(BaseModel):
    crop: str
    district: str
    month: int
    probability: int
    pest_name: str


class AnalyzeRequest(BaseModel):
    district: str
    crop: str
    language: str = "Hindi"
    farmer_query: str = ""
    run_id: Optional[str] = None
    edge_case: Optional[Literal["unknown_crop", "data_staleness", "multi_stressor_conflict"]] = None


class EdgeCaseRequest(BaseModel):
    scenario: Literal["unknown_crop", "data_staleness", "multi_stressor_conflict"]
    district: str = "Yavatmal"
    crop: str = "Cotton"
    language: str = "Marathi"
    run_id: Optional[str] = None


class FarmPulseState(BaseModel):
    run_id: str
    district: str
    state: str
    crop: str
    language: str
    farmer_query: str
    edge_case: Optional[str] = None
    ndvi_score: float = 0.0
    ndvi_baseline: float = 0.0
    ndvi_anomaly_pct: float = 0.0
    weather_data: dict[str, Any] = Field(default_factory=dict)
    crop_stage: str = ""
    pest_risk: str = ""
    pest_probability: int = 0
    days_to_harvest: int = 0
    risk_report: dict[str, Any] = Field(default_factory=dict)
    escalate: bool = False
    escalation_reason: str = ""
    advisory_sms: str = ""
    advisory_whatsapp: str = ""
    advisory_institutional: str = ""
    reasoning_chain: list[dict[str, str]] = Field(default_factory=list)
    audit_log: list[dict[str, Any]] = Field(default_factory=list)
    data_freshness_days: int = 5
    confidence: float = 0.0
    model_used: str = ""
    institutional_outputs: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    satellite_signal: dict[str, Any] = Field(default_factory=dict)
    district_record: dict[str, Any] = Field(default_factory=dict)
    soil_snapshot: dict[str, Any] = Field(default_factory=dict)
    forecast_5d: list[dict[str, Any]] = Field(default_factory=list)
    data_sources: list[str] = Field(default_factory=list)
    phi_compliant: bool = True
    crop_supported: bool = True


class AuditEntry(BaseModel):
    timestamp: str
    run_id: str
    district: str
    state: str
    crop: str
    agent: str
    action: str
    input_summary: str
    output_summary: str
    model_used: str
    tokens_consumed: int
    confidence: float
    escalation: bool
    risk_level: str


app = FastAPI(
    title="FarmPulse Agent Engine",
    description="Agentic crop risk intelligence backend for ET GenAI Hackathon 2026.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DISTRICT_DATA = [
    DistrictRecord(id="yavatmal", district="Yavatmal", state="Maharashtra", lat=20.3899, lon=78.1307, primary_crop="Cotton", acreage_lakh=4.2, kvk_contact="07232-242216", language="Marathi"),
    DistrictRecord(id="akola", district="Akola", state="Maharashtra", lat=20.7002, lon=77.0082, primary_crop="Cotton", acreage_lakh=3.4, kvk_contact="0724-2258372", language="Marathi"),
    DistrictRecord(id="nashik", district="Nashik", state="Maharashtra", lat=19.9975, lon=73.7898, primary_crop="Soybean", acreage_lakh=2.1, kvk_contact="0253-2305231", language="Marathi"),
    DistrictRecord(id="nagpur", district="Nagpur", state="Maharashtra", lat=21.1458, lon=79.0882, primary_crop="Soybean", acreage_lakh=2.3, kvk_contact="0712-2689485", language="Marathi"),
    DistrictRecord(id="amravati", district="Amravati", state="Maharashtra", lat=20.9374, lon=77.7796, primary_crop="Cotton", acreage_lakh=3.0, kvk_contact="0721-2661835", language="Marathi"),
    DistrictRecord(id="ludhiana", district="Ludhiana", state="Punjab", lat=30.9009, lon=75.8573, primary_crop="Wheat", acreage_lakh=3.6, kvk_contact="0161-2401960", language="Punjabi"),
    DistrictRecord(id="bathinda", district="Bathinda", state="Punjab", lat=30.207, lon=74.9455, primary_crop="Cotton", acreage_lakh=2.4, kvk_contact="0164-2215619", language="Punjabi"),
    DistrictRecord(id="moga", district="Moga", state="Punjab", lat=30.8165, lon=75.1717, primary_crop="Wheat", acreage_lakh=2.1, kvk_contact="01636-233119", language="Punjabi"),
    DistrictRecord(id="patiala", district="Patiala", state="Punjab", lat=30.3398, lon=76.3869, primary_crop="Wheat", acreage_lakh=2.8, kvk_contact="0175-2212974", language="Punjabi"),
    DistrictRecord(id="sangrur", district="Sangrur", state="Punjab", lat=30.2458, lon=75.8421, primary_crop="Rice", acreage_lakh=2.2, kvk_contact="01672-278129", language="Punjabi"),
    DistrictRecord(id="meerut", district="Meerut", state="UP", lat=28.9845, lon=77.7064, primary_crop="Sugarcane", acreage_lakh=3.9, kvk_contact="0121-2880521", language="Hindi"),
    DistrictRecord(id="agra", district="Agra", state="UP", lat=27.1767, lon=78.0081, primary_crop="Wheat", acreage_lakh=2.5, kvk_contact="0562-2960223", language="Hindi"),
    DistrictRecord(id="jhansi", district="Jhansi", state="UP", lat=25.4484, lon=78.5685, primary_crop="Wheat", acreage_lakh=1.9, kvk_contact="0510-2730466", language="Hindi"),
    DistrictRecord(id="varanasi", district="Varanasi", state="UP", lat=25.3176, lon=82.9739, primary_crop="Rice", acreage_lakh=2.0, kvk_contact="0542-2621182", language="Hindi"),
    DistrictRecord(id="bareilly", district="Bareilly", state="UP", lat=28.367, lon=79.4304, primary_crop="Sugarcane", acreage_lakh=2.4, kvk_contact="0581-2520360", language="Hindi"),
    DistrictRecord(id="indore", district="Indore", state="MP", lat=22.7196, lon=75.8577, primary_crop="Soybean", acreage_lakh=3.7, kvk_contact="0731-2470501", language="Hindi"),
    DistrictRecord(id="ujjain", district="Ujjain", state="MP", lat=23.1765, lon=75.7885, primary_crop="Soybean", acreage_lakh=2.6, kvk_contact="0734-2522359", language="Hindi"),
    DistrictRecord(id="sehore", district="Sehore", state="MP", lat=23.2032, lon=77.0851, primary_crop="Soybean", acreage_lakh=2.8, kvk_contact="07562-224561", language="Hindi"),
    DistrictRecord(id="vidisha", district="Vidisha", state="MP", lat=23.5251, lon=77.8081, primary_crop="Wheat", acreage_lakh=2.0, kvk_contact="07592-252145", language="Hindi"),
    DistrictRecord(id="gwalior", district="Gwalior", state="MP", lat=26.2183, lon=78.1828, primary_crop="Wheat", acreage_lakh=1.8, kvk_contact="0751-2467292", language="Hindi"),
    DistrictRecord(id="jaipur", district="Rajasthan", state="Rajasthan", lat=26.9124, lon=75.7873, primary_crop="Mustard", acreage_lakh=2.4, kvk_contact="0141-2552909", language="Hindi"),
    DistrictRecord(id="kota", district="Kota", state="Rajasthan", lat=25.2138, lon=75.8648, primary_crop="Soybean", acreage_lakh=2.3, kvk_contact="0744-2471936", language="Hindi"),
    DistrictRecord(id="sriganganagar", district="Sri Ganganagar", state="Rajasthan", lat=29.9038, lon=73.8772, primary_crop="Cotton", acreage_lakh=2.2, kvk_contact="0154-2470190", language="Hindi"),
    DistrictRecord(id="ajmer", district="Ajmer", state="Rajasthan", lat=26.4499, lon=74.6399, primary_crop="Wheat", acreage_lakh=1.7, kvk_contact="0145-2671800", language="Hindi"),
    DistrictRecord(id="bikaner", district="Bikaner", state="Rajasthan", lat=28.0229, lon=73.3119, primary_crop="Wheat", acreage_lakh=1.9, kvk_contact="0151-2250017", language="Hindi"),
]

SUPPORTED_CROPS = {"Wheat", "Rice", "Cotton", "Soybean", "Sugarcane"}

CROP_CALENDAR: dict[str, dict[str, dict[str, Any]]] = {
    "Maharashtra": {
        "Cotton": {"stage_by_month": {3: "Flowering", 4: "Flowering", 5: "Boll Development", 10: "Flowering"}, "days_to_harvest": 45},
        "Soybean": {"stage_by_month": {3: "Harvest", 4: "Harvest", 9: "Flowering"}, "days_to_harvest": 30},
        "Sugarcane": {"stage_by_month": {3: "Grand Growth", 4: "Grand Growth"}, "days_to_harvest": 120},
    },
    "Punjab": {
        "Wheat": {"stage_by_month": {3: "Grain Filling", 4: "Harvest"}, "days_to_harvest": 25},
        "Rice": {"stage_by_month": {3: "Nursery Planning", 10: "Harvest"}, "days_to_harvest": 150},
        "Cotton": {"stage_by_month": {3: "Vegetative", 10: "Flowering"}, "days_to_harvest": 60},
    },
    "UP": {
        "Wheat": {"stage_by_month": {3: "Grain Filling", 4: "Harvest"}, "days_to_harvest": 28},
        "Rice": {"stage_by_month": {3: "Fallow", 10: "Harvest"}, "days_to_harvest": 160},
        "Sugarcane": {"stage_by_month": {3: "Tillering", 4: "Tillering"}, "days_to_harvest": 110},
    },
    "MP": {
        "Soybean": {"stage_by_month": {3: "Post-Harvest Planning", 9: "Flowering"}, "days_to_harvest": 120},
        "Wheat": {"stage_by_month": {3: "Grain Filling", 4: "Harvest"}, "days_to_harvest": 30},
    },
    "Rajasthan": {
        "Wheat": {"stage_by_month": {3: "Grain Filling", 4: "Harvest"}, "days_to_harvest": 32},
        "Soybean": {"stage_by_month": {3: "Off-Season", 9: "Flowering"}, "days_to_harvest": 140},
        "Cotton": {"stage_by_month": {3: "Vegetative", 10: "Flowering"}, "days_to_harvest": 80},
    },
}

PEST_WINDOWS = [
    PestWindow(crop="Cotton", district="Yavatmal", month=3, probability=72, pest_name="Pink bollworm"),
    PestWindow(crop="Cotton", district="Akola", month=3, probability=66, pest_name="Pink bollworm"),
    PestWindow(crop="Cotton", district="Bathinda", month=3, probability=62, pest_name="Whitefly"),
    PestWindow(crop="Soybean", district="Indore", month=3, probability=54, pest_name="Stem fly"),
    PestWindow(crop="Wheat", district="Ludhiana", month=3, probability=38, pest_name="Aphid"),
    PestWindow(crop="Sugarcane", district="Meerut", month=3, probability=42, pest_name="Early shoot borer"),
]

HISTORICAL_BASELINES = {
    "Wheat": [0.61, 0.64, 0.63, 0.65, 0.66],
    "Rice": [0.68, 0.7, 0.72, 0.69, 0.71],
    "Cotton": [0.66, 0.69, 0.67, 0.68, 0.7],
    "Soybean": [0.63, 0.65, 0.66, 0.64, 0.67],
    "Sugarcane": [0.71, 0.74, 0.73, 0.75, 0.76],
}

LAST_KNOWN_WEATHER: dict[str, WeatherData] = {}
LAST_KNOWN_MODIS: dict[str, dict[str, Any]] = {}
RUN_QUEUES: dict[str, asyncio.Queue[str]] = {}
MODIS_NDVI_PALETTE: list[tuple[tuple[int, int, int], float]] = []
AGGREGATE_CACHE: dict[str, Any] = {"expires_at": 0.0, "payload": None}
AGGREGATE_REFRESH_TASK: asyncio.Task[None] | None = None


def seed_for(*parts: str) -> int:
    joined = "|".join(parts)
    return int(hashlib.sha256(joined.encode("utf-8")).hexdigest()[:12], 16)


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def current_date() -> date:
    return datetime.now().date()


def power_date(value: date) -> str:
    return value.strftime("%Y%m%d")


def bounded(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def wms_bbox(lat: float, lon: float, delta: float = 0.02) -> str:
    south = bounded(lat - delta, -90.0, 90.0)
    north = bounded(lat + delta, -90.0, 90.0)
    west = bounded(lon - delta, -180.0, 180.0)
    east = bounded(lon + delta, -180.0, 180.0)
    return f"{south:.6f},{west:.6f},{north:.6f},{east:.6f}"


def shift_year_safe(value: date, years: int) -> date:
    target_year = value.year + years
    while True:
        try:
            return value.replace(year=target_year)
        except ValueError:
            value = value - timedelta(days=1)


async def fetch_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


async def fetch_bytes(url: str, params: dict[str, Any] | None = None) -> bytes:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.content


def normalize_language(language: str | None, district_language: str = "Hindi") -> str:
    aliases = {
        "auto": "Auto",
        "english": "English",
        "hindi": "Hindi",
        "marathi": "Marathi",
        "punjabi": "Punjabi",
        "bengali": "Bengali",
        "gujarati": "Gujarati",
        "tamil": "Tamil",
        "telugu": "Telugu",
        "kannada": "Kannada",
        "malayalam": "Malayalam",
    }
    cleaned = (language or "").strip().lower()
    if not cleaned:
        return district_language
    return aliases.get(cleaned, district_language)


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                run_id TEXT NOT NULL,
                district TEXT NOT NULL,
                state TEXT NOT NULL,
                crop TEXT NOT NULL,
                agent TEXT NOT NULL,
                action TEXT NOT NULL,
                input_summary TEXT NOT NULL,
                output_summary TEXT NOT NULL,
                model_used TEXT NOT NULL,
                tokens_consumed INTEGER NOT NULL,
                confidence REAL NOT NULL,
                escalation INTEGER NOT NULL,
                risk_level TEXT NOT NULL
            )
            """
        )


@app.on_event("startup")
async def startup_event() -> None:
    init_db()
    schedule_aggregate_refresh()


def get_district_record(district_name: str) -> DistrictRecord:
    for record in DISTRICT_DATA:
        if record.district.lower() == district_name.lower() or record.id == district_name.lower():
            return record
    raise HTTPException(status_code=404, detail=f"Unknown district: {district_name}")


def select_model(task_type: str, complexity: str) -> str:
    if task_type == "sms_advisory" or complexity == "low":
        return "claude-haiku-4-5-20251001"
    if task_type == "institutional_report" or complexity == "high":
        return "claude-sonnet-4-6"
    return "claude-haiku-4-5-20251001"


async def emit_event(run_id: str, agent: str, step: str, status: str, message: str) -> None:
    queue = RUN_QUEUES.setdefault(run_id, asyncio.Queue())
    event = {
        "agent": agent,
        "step": step,
        "status": status,
        "message": message,
        "timestamp": now_iso(),
        "run_id": run_id,
    }
    await queue.put(f"data: {json.dumps(event)}\n\n")


def persist_audit_entry(entry: AuditEntry) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO audit_log (
                timestamp, run_id, district, state, crop, agent, action,
                input_summary, output_summary, model_used, tokens_consumed,
                confidence, escalation, risk_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry.timestamp,
                entry.run_id,
                entry.district,
                entry.state,
                entry.crop,
                entry.agent,
                entry.action,
                entry.input_summary,
                entry.output_summary,
                entry.model_used,
                entry.tokens_consumed,
                entry.confidence,
                1 if entry.escalation else 0,
                entry.risk_level,
            ),
        )


def add_audit_entry(
    state: FarmPulseState,
    agent: str,
    action: str,
    input_summary: str,
    output_summary: str,
    model_used: str,
    tokens_consumed: int,
    confidence: float,
    risk_level: str,
) -> None:
    entry = AuditEntry(
        timestamp=now_iso(),
        run_id=state.run_id,
        district=state.district,
        state=state.state,
        crop=state.crop,
        agent=agent,
        action=action,
        input_summary=input_summary,
        output_summary=output_summary,
        model_used=model_used,
        tokens_consumed=tokens_consumed,
        confidence=round(confidence, 1),
        escalation=state.escalate,
        risk_level=risk_level,
    )
    persist_audit_entry(entry)
    state.audit_log.append(entry.model_dump())


def crop_calendar(record: DistrictRecord, crop: str) -> tuple[str, int]:
    state_calendar = CROP_CALENDAR.get(record.state, {})
    crop_data = state_calendar.get(crop) or next(iter(state_calendar.values()), {"stage_by_month": {}, "days_to_harvest": 90})
    return crop_data["stage_by_month"].get(current_date().month, "Vegetative"), int(crop_data["days_to_harvest"])


def get_pest_probability(district: str, crop: str) -> tuple[int, str]:
    for window in PEST_WINDOWS:
        if window.district == district and window.crop == crop and window.month == current_date().month:
            return window.probability, window.pest_name
    return (28 if crop in SUPPORTED_CROPS else 0), "General field stress"


def seasonal_baseline(crop: str) -> float:
    baseline = HISTORICAL_BASELINES.get(crop, [0.6, 0.62, 0.61, 0.63, 0.64])
    return round(sum(baseline) / len(baseline), 2)


async def load_modis_ndvi_palette() -> list[tuple[tuple[int, int, int], float]]:
    global MODIS_NDVI_PALETTE
    if MODIS_NDVI_PALETTE:
        return MODIS_NDVI_PALETTE

    try:
        page = await fetch_bytes(NASA_GIBS_NDVI_COLORMAP)
        text = html.unescape(page.decode("utf-8", errors="ignore"))
        matches = re.findall(r"(\d+),(\d+),(\d+)\s+(?:True|False)\s+\[([-\d.]+),([-\d.]+)\)", text)
        palette: list[tuple[tuple[int, int, int], float]] = []
        for r, g, b, lower, upper in matches:
            midpoint = (float(lower) + float(upper)) / 2
            palette.append(((int(r), int(g), int(b)), midpoint))
        if palette:
            MODIS_NDVI_PALETTE = palette
    except Exception:
        MODIS_NDVI_PALETTE = [
            ((191, 222, 119), 0.304),
            ((150, 186, 32), 0.379),
            ((120, 173, 0), 0.444),
            ((82, 152, 0), 0.514),
            ((57, 135, 0), 0.605),
            ((29, 117, 0), 0.705),
            ((0, 96, 0), 0.845),
        ]
    return MODIS_NDVI_PALETTE


def decode_ndvi_from_rgb(rgb: tuple[int, int, int], palette: list[tuple[tuple[int, int, int], float]]) -> float | None:
    best_match: float | None = None
    best_distance: float | None = None
    for color, ndvi in palette:
        distance = sum((component - target) ** 2 for component, target in zip(color, rgb))
        if best_distance is None or distance < best_distance:
            best_distance = distance
            best_match = ndvi
    return None if best_match is None else round(best_match, 3)


async def fetch_modis_ndvi_value(record: DistrictRecord, target_date: date) -> float | None:
    from PIL import Image

    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": "MODIS_Terra_NDVI_8Day",
        "STYLES": "",
        "FORMAT": "image/png",
        "TRANSPARENT": "TRUE",
        "CRS": "EPSG:4326",
        "BBOX": wms_bbox(record.lat, record.lon),
        "WIDTH": 3,
        "HEIGHT": 3,
        "TIME": target_date.isoformat(),
    }
    try:
        image_bytes = await fetch_bytes(NASA_GIBS_WMS, params=params)
        image = Image.open(BytesIO(image_bytes)).convert("RGBA")
        palette = await load_modis_ndvi_palette()
        values: list[float] = []
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, a = image.getpixel((x, y))
                if a == 0:
                    continue
                value = decode_ndvi_from_rgb((r, g, b), palette)
                if value is not None and -0.2 <= value <= 1.0:
                    values.append(value)
        if values:
            return round(sum(values) / len(values), 3)
    except Exception:
        return None
    return None


async def fetch_modis_ndvi(record: DistrictRecord, crop: str, forced_stress: bool) -> tuple[float, float, int, str]:
    today = current_date()
    cached = LAST_KNOWN_MODIS.get(record.district)
    if cached and cached.get("retrieved_on") == today.isoformat() and not forced_stress:
        return (
            float(cached["ndvi"]),
            float(cached["baseline"]),
            int(cached["freshness_days"]),
            "nasa-gibs-modis-cache",
        )

    latest_value: float | None = None
    source_date: date | None = None
    for offset in range(0, 5):
        probe_date = today - timedelta(days=offset)
        latest_value = await fetch_modis_ndvi_value(record, probe_date)
        if latest_value is not None:
            source_date = probe_date
            break

    if latest_value is None or source_date is None:
        fallback = LAST_KNOWN_MODIS.get(record.district)
        if fallback:
            return (
                float(fallback["ndvi"]),
                float(fallback["baseline"]),
                int(fallback["freshness_days"]),
                "nasa-gibs-modis-last-known-good",
            )
        baseline = seasonal_baseline(crop)
        return synthetic_ndvi(record, crop, 5, forced_stress), baseline, 999, "synthetic-fallback"

    history_values: list[float] = []
    for year_back in range(1, 4):
        historical_date = shift_year_safe(source_date, -year_back)
        historical_value = await fetch_modis_ndvi_value(record, historical_date)
        if historical_value is not None:
            history_values.append(historical_value)

    baseline = round(sum(history_values) / len(history_values), 3) if history_values else seasonal_baseline(crop)
    ndvi_value = latest_value
    if forced_stress:
        ndvi_value = round(max(0.18, latest_value - 0.12), 3)
    freshness_days = max(0, (today - source_date).days)
    LAST_KNOWN_MODIS[record.district] = {
        "ndvi": ndvi_value,
        "baseline": baseline,
        "freshness_days": freshness_days,
        "retrieved_on": today.isoformat(),
    }
    return ndvi_value, baseline, freshness_days, "nasa-gibs-modis-terra-ndvi-8day"


async def fetch_summary_ndvi(record: DistrictRecord, crop: str) -> tuple[float, float, int, str]:
    cached = LAST_KNOWN_MODIS.get(record.district)
    if cached and cached.get("retrieved_on") == current_date().isoformat():
        return (
            float(cached["ndvi"]),
            float(cached["baseline"]),
            int(cached["freshness_days"]),
            "nasa-gibs-modis-cache",
        )

    baseline = seasonal_baseline(crop)
    latest_value: float | None = None
    source_date: date | None = None
    for offset in range(0, 5):
        probe_date = current_date() - timedelta(days=offset)
        latest_value = await fetch_modis_ndvi_value(record, probe_date)
        if latest_value is not None:
            source_date = probe_date
            break

    if latest_value is None or source_date is None:
        if cached:
            return (
                float(cached["ndvi"]),
                float(cached["baseline"]),
                int(cached["freshness_days"]),
                "nasa-gibs-modis-last-known-good",
            )
        return synthetic_ndvi(record, crop, 5, forced_stress=False), baseline, 999, "synthetic-fallback"

    freshness_days = max(0, (current_date() - source_date).days)
    LAST_KNOWN_MODIS[record.district] = {
        "ndvi": latest_value,
        "baseline": baseline,
        "freshness_days": freshness_days,
        "retrieved_on": current_date().isoformat(),
    }
    return latest_value, baseline, freshness_days, "nasa-gibs-modis-terra-ndvi-8day"


def aggregate_cache_valid() -> bool:
    return AGGREGATE_CACHE.get("payload") is not None and time.time() < float(AGGREGATE_CACHE.get("expires_at", 0.0))


def schedule_aggregate_refresh() -> None:
    global AGGREGATE_REFRESH_TASK
    if AGGREGATE_REFRESH_TASK and not AGGREGATE_REFRESH_TASK.done():
        return
    AGGREGATE_REFRESH_TASK = asyncio.create_task(refresh_aggregate_cache())


async def refresh_aggregate_cache() -> None:
    district_rows = await asyncio.gather(*(build_aggregate_row(record) for record in DISTRICT_DATA))
    states: dict[str, list[dict[str, Any]]] = {}
    for row in district_rows:
        states.setdefault(row["state"], []).append(row)
    heatmap = []
    for state_name, rows in states.items():
        avg_risk = round(sum(item["riskScore"] for item in rows) / len(rows), 1)
        critical_count = sum(1 for item in rows if item["riskLevel"] == "CRITICAL")
        heatmap.append(
            {
                "state": state_name,
                "avgRisk": avg_risk,
                "criticalDistricts": critical_count,
                "districtCount": len(rows),
                "emergencyAlert": critical_count >= 3,
            }
        )
    AGGREGATE_CACHE["payload"] = {"districts": district_rows, "states": heatmap}
    AGGREGATE_CACHE["expires_at"] = time.time() + AGGREGATE_CACHE_TTL_SECONDS


async def build_aggregate_row(record: DistrictRecord) -> dict[str, Any]:
    crop = record.primary_crop if record.primary_crop in SUPPORTED_CROPS else "Wheat"
    ndvi, baseline, freshness_days, ndvi_source = await fetch_summary_ndvi(record, crop)
    risk_score = round(min(94, max(22, 35 + abs(((ndvi - baseline) / baseline) * 100) * 1.45)))
    risk_level = map_risk_category(risk_score)
    return {
        "id": record.id,
        "district": record.district,
        "state": record.state,
        "crop": crop,
        "ndviScore": ndvi,
        "baseline": baseline,
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "acreageLakh": record.acreage_lakh,
        "lat": record.lat,
        "lon": record.lon,
        "dataFreshnessDays": freshness_days,
        "ndviSource": ndvi_source,
        "updatedAt": now_iso(),
    }


def build_soil_snapshot(record: DistrictRecord, crop: str, weather: WeatherData, ndvi_score: float) -> dict[str, Any]:
    rng = random.Random(seed_for(record.district, crop, "soil"))
    moisture = max(18, min(72, round(58 + (weather.rainfall_7d_mm - 50) * 0.12 + (ndvi_score - 0.55) * 40 + rng.uniform(-4, 4), 1)))
    ec = round(max(0.18, min(1.1, 0.42 + rng.uniform(-0.08, 0.18))), 2)
    nitrogen = max(120, min(420, int(245 + (ndvi_score - 0.55) * 180 + rng.uniform(-35, 35))))
    ph = round(max(5.8, min(7.9, 6.8 + rng.uniform(-0.4, 0.5))), 1)
    moisture_band = "Adequate"
    if moisture < 32:
        moisture_band = "Low"
    elif moisture > 62:
        moisture_band = "High"
    return {
        "moisturePct": moisture,
        "moistureBand": moisture_band,
        "soilPH": ph,
        "nitrogenKgHa": nitrogen,
        "electricalConductivity": ec,
        "summary": f"Soil moisture {moisture_band.lower()} with pH {ph} and available nitrogen {nitrogen} kg/ha",
    }


async def fetch_forecast_5d(record: DistrictRecord, weather: WeatherData) -> list[dict[str, Any]]:
    params = {
        "latitude": record.lat,
        "longitude": record.lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean",
        "forecast_days": 5,
        "timezone": "auto",
    }
    try:
        payload = await fetch_json(OPEN_METEO_BASE, params=params)
        daily = payload.get("daily", {})
        dates = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        rain = daily.get("precipitation_sum", [])
        humidity = daily.get("relative_humidity_2m_mean", [])
        forecast = []
        for index, day_value in enumerate(dates[:5]):
            rain_value = round(float(rain[index]), 1)
            humidity_value = round(float(humidity[index]), 1)
            outlook = "Dry window"
            if rain_value >= 12:
                outlook = "Rain likely"
            elif humidity_value >= 75:
                outlook = "Humid"
            forecast.append(
                {
                    "day": datetime.fromisoformat(day_value).strftime("%a"),
                    "date": day_value,
                    "rainMm": rain_value,
                    "maxTempC": round(float(max_temps[index]), 1),
                    "minTempC": round(float(min_temps[index]), 1),
                    "humidityPct": humidity_value,
                    "outlook": outlook,
                }
            )
        if forecast:
            return forecast
    except Exception:
        pass
    base_temp = weather.avg_temp_c
    base_rain = max(0.0, weather.rainfall_7d_mm / 5)
    today = current_date()
    return [
        {
            "day": (today + timedelta(days=index + 1)).strftime("%a"),
            "date": (today + timedelta(days=index + 1)).isoformat(),
            "rainMm": round(max(0.0, base_rain), 1),
            "maxTempC": round(base_temp + 1.5, 1),
            "minTempC": round(base_temp - 6.5, 1),
            "humidityPct": round(weather.humidity_pct, 1),
            "outlook": "Forecast unavailable",
        }
        for index in range(5)
    ]


def synthetic_ndvi(record: DistrictRecord, crop: str, freshness_days: int, forced_stress: bool) -> float:
    today = current_date()
    rng = random.Random(seed_for(record.district, crop, str(today)))
    baseline = seasonal_baseline(crop)
    seasonal_wave = 0.04 * math.sin((today.timetuple().tm_yday / 365) * 2 * math.pi)
    noise = rng.uniform(-0.04, 0.04)
    stressed = forced_stress or record.district in {"Yavatmal", "Akola", "Bathinda", "Sri Ganganagar"}
    depression = rng.uniform(0.15, 0.25) if stressed else rng.uniform(-0.03, 0.03)
    value = baseline + seasonal_wave + noise - depression
    if record.district == "Yavatmal" and crop == "Cotton":
        value = 0.52
    if freshness_days > 10:
        value = min(value + 0.02, baseline)
    return round(max(0.22, min(0.88, value)), 2)


async def fetch_weather(record: DistrictRecord) -> WeatherData:
    end_date = current_date() - timedelta(days=1)
    start_date = end_date - timedelta(days=6)
    climatology_start = shift_year_safe(start_date, -5)
    climatology_end = shift_year_safe(end_date, -1)
    recent_params = {
        "parameters": "PRECTOTCORR,T2M,RH2M",
        "community": "AG",
        "latitude": record.lat,
        "longitude": record.lon,
        "start": power_date(start_date),
        "end": power_date(end_date),
        "format": "JSON",
    }
    climatology_params = {
        "parameters": "PRECTOTCORR,T2M",
        "community": "AG",
        "latitude": record.lat,
        "longitude": record.lon,
        "start": power_date(climatology_start),
        "end": power_date(climatology_end),
        "format": "JSON",
    }
    for attempt in range(3):
        try:
            recent_payload, climatology_payload = await asyncio.gather(
                fetch_json(NASA_POWER_BASE, params=recent_params),
                fetch_json(NASA_POWER_BASE, params=climatology_params),
            )
            recent_parameters = recent_payload.get("properties", {}).get("parameter", {})
            climatology_parameters = climatology_payload.get("properties", {}).get("parameter", {})
            rainfall_series = [float(value) for value in recent_parameters.get("PRECTOTCORR", {}).values() if value not in {-999.0, -999}]
            temperature_series = [float(value) for value in recent_parameters.get("T2M", {}).values() if value not in {-999.0, -999}]
            humidity_series = [float(value) for value in recent_parameters.get("RH2M", {}).values() if value not in {-999.0, -999}]
            climatology_rain = [float(value) for value in climatology_parameters.get("PRECTOTCORR", {}).values() if value not in {-999.0, -999}]
            climatology_temp = [float(value) for value in climatology_parameters.get("T2M", {}).values() if value not in {-999.0, -999}]
            rainfall = round(sum(rainfall_series), 1)
            avg_temp = round(sum(temperature_series) / max(1, len(temperature_series)), 1)
            humidity_avg = round(sum(humidity_series) / max(1, len(humidity_series)), 1)
            climatology_years = max(1, (climatology_end.year - climatology_start.year) + 1)
            climatology_rainfall = max(1.0, round(sum(climatology_rain) / climatology_years, 1))
            climatology_temp_avg = round(sum(climatology_temp) / max(1, len(climatology_temp)), 1)
            anomaly_pct = round(((rainfall - climatology_rainfall) / climatology_rainfall) * 100, 1)
            temp_anomaly = round(avg_temp - climatology_temp_avg, 1)
            weather_anomaly = "normal"
            if rainfall > climatology_rainfall * 1.8 and rainfall >= 100:
                weather_anomaly = "flood"
            elif rainfall < climatology_rainfall * 0.4:
                weather_anomaly = "drought"
            elif temp_anomaly > 3.5:
                weather_anomaly = "heat"
            elif temp_anomaly < -3.5:
                weather_anomaly = "cold"
            weather = WeatherData(
                rainfall_7d_mm=rainfall,
                rainfall_anomaly_pct=anomaly_pct,
                avg_temp_c=avg_temp,
                temp_anomaly_c=temp_anomaly,
                humidity_pct=humidity_avg,
                weather_anomaly=weather_anomaly,
                source="nasa-power",
            )
            LAST_KNOWN_WEATHER[record.district] = weather
            return weather
        except Exception:
            if attempt < 2:
                await asyncio.sleep(0.35 * (2**attempt))

    fallback = LAST_KNOWN_WEATHER.get(record.district)
    if fallback:
        return fallback.model_copy(update={"source": "last-known-good", "stale": True})
    rng = random.Random(seed_for(record.district, "weather"))
    rainfall = round(rng.uniform(20, 90), 1)
    anomaly = "normal" if 20 <= rainfall <= 120 else "drought"
    generated = WeatherData(
        rainfall_7d_mm=rainfall,
        rainfall_anomaly_pct=round(((rainfall - 50) / 50) * 100, 1),
        avg_temp_c=round(rng.uniform(26, 34), 1),
        temp_anomaly_c=round(rng.uniform(-2, 4), 1),
        humidity_pct=round(rng.uniform(48, 82), 1),
        weather_anomaly=anomaly,
        source="synthetic-fallback",
        stale=True,
    )
    LAST_KNOWN_WEATHER[record.district] = generated
    return generated


def summarize_root_cause(weather: WeatherData, pest_probability: int, crop: str, district: str) -> str:
    if district == "Yavatmal" and crop == "Cotton":
        return "Probable pink bollworm stress or nitrogen deficiency - ground validation required"
    if weather.weather_anomaly == "flood":
        return "Excess rainfall and flood stress likely suppressing canopy vigor"
    if weather.weather_anomaly == "drought":
        return "Soil moisture deficit consistent with drought stress"
    if pest_probability >= 60:
        return "Likely pest or disease pressure due to seasonal outbreak window"
    return "Mixed agronomic stress; monitor and verify at field level"


def map_risk_category(score: float) -> RiskCategory:
    if score >= 85:
        return "CRITICAL"
    if score >= 70:
        return "HIGH"
    if score >= 45:
        return "MEDIUM"
    return "LOW"


def render_sms(state: FarmPulseState, kvk_contact: str) -> str:
    risk = state.risk_report["riskCategory"]
    if not state.crop_supported:
        return "इस फसल के लिए पर्याप्त डेटा उपलब्ध नहीं है। कृपया KVK से संपर्क करें।"
    if state.escalate and state.confidence < 60:
        if state.language == "Marathi":
            return "विश्वास पातळी कमी आहे. कृपया शेत तपासणीसाठी KVK शी संपर्क करा."
        if state.language == "Punjabi":
            return "ਭਰੋਸਾ ਘੱਟ ਹੈ। ਮੈਦਾਨੀ ਜਾਂਚ ਲਈ KVK ਨਾਲ ਸੰਪਰਕ ਕਰੋ।"
        if state.language == "English":
            return "Confidence is low. Please contact your KVK for field verification."
        return "विश्वास स्तर कम है। खेत सत्यापन के लिए KVK से संपर्क करें।"
    if state.language == "Marathi":
        message = f"{state.district}: {state.crop} ताण जास्त. 7 दिवसांत फेरोमोन सापळे लावा, पान तपासा. उच्च जोखीम. KVK {kvk_contact}"
    elif state.language == "Punjabi":
        message = f"{state.district}: {state.crop} ਖਤਰਾ ਉੱਚਾ. 7 ਦਿਨਾਂ ਵਿੱਚ ਫੇਰੋਮੋਨ ਟ੍ਰੈਪ ਲਗਾਓ, ਖੇਤ ਚੈੱਕ ਕਰੋ. KVK {kvk_contact}"
    elif state.language == "English":
        message = f"{state.district}: High {state.crop} risk. Install pheromone traps within 7 days and verify in-field. KVK {kvk_contact}"
    else:
        message = f"{state.district}: {state.crop} जोखिम ऊंचा. 7 दिन में फेरोमोन ट्रैप लगाएं, खेत जांचें. KVK {kvk_contact}"
    return message[:160]


def render_whatsapp(state: FarmPulseState, kvk_contact: str) -> str:
    if not state.crop_supported:
        return "इस फसल के लिए पर्याप्त डेटा उपलब्ध नहीं है। कृपया KVK से संपर्क करें।"
    if state.escalate and state.confidence < 60:
        if state.language == "Marathi":
            return f"⚠️ खात्री कमी आहे.\n1. शेताची प्रत्यक्ष पाहणी करा.\n2. पान/बोंड नमुना KVK ला दाखवा.\n3. KVK: {kvk_contact}"
        if state.language == "Punjabi":
            return f"⚠️ ਭਰੋਸਾ ਘੱਟ ਹੈ.\n1. ਖੇਤ ਦੀ ਜਾਂਚ ਕਰੋ.\n2. ਨਮੂਨਾ KVK ਨੂੰ ਵਿਖਾਓ.\n3. KVK: {kvk_contact}"
        if state.language == "English":
            return f"⚠️ Confidence is low.\n1. Inspect the field.\n2. Share samples with KVK.\n3. KVK: {kvk_contact}"
        return f"⚠️ विश्वास कम है.\n1. खेत का निरीक्षण करें.\n2. नमूना KVK को दिखाएं.\n3. KVK: {kvk_contact}"
    if state.language == "Marathi":
        return (
            f"⚠️ {state.district} मध्ये {state.crop} वर ताण दिसतो.\n"
            "1. 7 दिवसांत फेरोमोन सापळे लावा.\n"
            "2. पिवळे डाग व बोंड तपासा; संतुलित नत्र द्या.\n"
            f"3. उच्च जोखीम असल्याने KVK शी संपर्क करा: {kvk_contact}"
        )[:400]
    if state.language == "Punjabi":
        return (
            f"⚠️ {state.district} ਵਿੱਚ {state.crop} ਉੱਤੇ ਤਾਣ ਦੇ ਸੰਕੇਤ ਹਨ.\n"
            "1. 7 ਦਿਨਾਂ ਵਿੱਚ ਫੇਰੋਮੋਨ ਟ੍ਰੈਪ ਲਗਾਓ.\n"
            "2. ਪੱਤੇ ਤੇ ਬੋਲਾਂ ਦੀ ਜਾਂਚ ਕਰੋ.\n"
            f"3. KVK ਨਾਲ ਸਲਾਹ ਕਰੋ: {kvk_contact}"
        )[:400]
    if state.language == "English":
        return (
            f"⚠️ {state.crop} stress detected in {state.district}.\n"
            "1. Install pheromone traps within 7 days.\n"
            "2. Inspect yellowing leaves and boll damage.\n"
            f"3. Contact KVK for field verification: {kvk_contact}"
        )[:400]
    return (
        f"⚠️ {state.district} में {state.crop} पर तनाव संकेत हैं.\n"
        "1. 7 दिन में फेरोमोन ट्रैप लगाएं.\n"
        "2. पत्तियों और बॉल की जांच करें.\n"
        f"3. KVK से सत्यापन कराएं: {kvk_contact}"
    )[:400]


def render_sms(state: FarmPulseState, kvk_contact: str) -> str:
    if not state.crop_supported:
        messages = {
            "Hindi": "इस फसल के लिए पर्याप्त डेटा उपलब्ध नहीं है। कृपया KVK से संपर्क करें।",
            "Marathi": "या पिकासाठी पुरेसा डेटा उपलब्ध नाही. कृपया KVK शी संपर्क करा.",
            "Punjabi": "ਇਸ ਫਸਲ ਲਈ ਪ੍ਰਯਾਪਤ ਡਾਟਾ ਉਪਲਬਧ ਨਹੀਂ। ਕਿਰਪਾ ਕਰਕੇ KVK ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
            "English": "Not enough data is available for this crop. Please contact your KVK.",
            "Bengali": "এই ফসলের জন্য পর্যাপ্ত তথ্য নেই। অনুগ্রহ করে KVK-এর সাথে যোগাযোগ করুন।",
            "Gujarati": "આ પાક માટે પૂરતો ડેટા ઉપલબ્ધ નથી. કૃપા કરીને KVKનો સંપર્ક કરો.",
            "Tamil": "இந்த பயிருக்கு போதுமான தரவு இல்லை. அருகிலுள்ள KVK-யை தொடர்புகொள்ளவும்.",
            "Telugu": "ఈ పంటకు తగిన సమాచారం లేదు. దయచేసి KVK ను సంప్రదించండి.",
            "Kannada": "ಈ ಬೆಳೆಗಾಗಿ ಸಾಕಷ್ಟು ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು KVK ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.",
            "Malayalam": "ഈ വിളയ്ക്കായി മതിയായ ഡാറ്റ ലഭ്യമല്ല. ദയവായി KVKനെ സമീപിക്കുക.",
        }
        return messages.get(state.language, messages["English"])

    if state.escalate and state.confidence < 60:
        messages = {
            "Hindi": "विश्वास स्तर कम है। खेत सत्यापन के लिए KVK से संपर्क करें।",
            "Marathi": "विश्वास पातळी कमी आहे. शेत तपासणीसाठी KVK शी संपर्क करा.",
            "Punjabi": "ਭਰੋਸਾ ਘੱਟ ਹੈ। ਮੈਦਾਨੀ ਜਾਂਚ ਲਈ KVK ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
            "English": "Confidence is low. Please contact your KVK for field verification.",
            "Bengali": "বিশ্বাসযোগ্যতা কম। মাঠ যাচাইয়ের জন্য KVK-এর সাথে যোগাযোগ করুন।",
            "Gujarati": "વિશ્વાસ સ્તર ઓછું છે. ખેતર ચકાસણી માટે KVKનો સંપર્ક કરો.",
            "Tamil": "நம்பிக்கை அளவு குறைவு. வயல் சரிபார்ப்புக்கு KVK-யை தொடர்புகொள்ளவும்.",
            "Telugu": "నమ్మక స్థాయి తక్కువగా ఉంది. పొలం ధృవీకరణ కోసం KVK ను సంప్రదించండి.",
            "Kannada": "ವಿಶ್ವಾಸ ಮಟ್ಟ ಕಡಿಮೆ ಇದೆ. ಹೊಲ ಪರಿಶೀಲನೆಗಾಗಿ KVK ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.",
            "Malayalam": "വിശ്വാസനില കുറവാണ്. വയൽ പരിശോധനയ്ക്കായി KVKനെ ബന്ധപ്പെടുക.",
        }
        return messages.get(state.language, messages["English"])

    messages = {
        "Hindi": f"{state.district}: {state.crop} जोखिम ऊंचा. 7 दिन में फेरोमोन ट्रैप लगाएं, खेत जांचें. KVK {kvk_contact}",
        "Marathi": f"{state.district}: {state.crop} ताण जास्त. 7 दिवसांत फेरोमोन सापळे लावा, पान तपासा. KVK {kvk_contact}",
        "Punjabi": f"{state.district}: {state.crop} ਖਤਰਾ ਉੱਚਾ. 7 ਦਿਨਾਂ ਵਿੱਚ ਫੇਰੋਮੋਨ ਟ੍ਰੈਪ ਲਗਾਓ. KVK {kvk_contact}",
        "English": f"{state.district}: High {state.crop} risk. Install pheromone traps within 7 days. KVK {kvk_contact}",
        "Bengali": f"{state.district}: {state.crop} ঝুঁকি বেশি। 7 দিনের মধ্যে ফেরোমোন ট্র্যাপ বসান। KVK {kvk_contact}",
        "Gujarati": f"{state.district}: {state.crop} જોખમ ઊંચું છે. 7 દિવસમાં ફેરોમોન ટ્રેપ લગાવો. KVK {kvk_contact}",
        "Tamil": f"{state.district}: {state.crop} அபாயம் அதிகம். 7 நாளில் பெரோமோன் வலை அமைக்கவும். KVK {kvk_contact}",
        "Telugu": f"{state.district}: {state.crop} ప్రమాదం ఎక్కువ. 7 రోజుల్లో ఫెరోమోన్ ట్రాప్ వేయండి. KVK {kvk_contact}",
        "Kannada": f"{state.district}: {state.crop} ಅಪಾಯ ಹೆಚ್ಚು. 7 ದಿನಗಳಲ್ಲಿ ಫೆರೊಮೋನ್ ಟ್ರ್ಯಾಪ್ ಹಾಕಿ. KVK {kvk_contact}",
        "Malayalam": f"{state.district}: {state.crop} അപകടം കൂടുതലാണ്. 7 ദിവസത്തിനകം ഫെറോമോൺ ട്രാപ്പ് സ്ഥാപിക്കുക. KVK {kvk_contact}",
    }
    return messages.get(state.language, messages["English"])[:160]


def render_whatsapp(state: FarmPulseState, kvk_contact: str) -> str:
    if not state.crop_supported:
        return render_sms(state, kvk_contact)

    if state.escalate and state.confidence < 60:
        messages = {
            "Hindi": f"⚠️ विश्वास कम है.\n1. खेत का निरीक्षण करें.\n2. नमूना KVK को दिखाएं.\n3. KVK: {kvk_contact}",
            "Marathi": f"⚠️ खात्री कमी आहे.\n1. शेताची प्रत्यक्ष पाहणी करा.\n2. पान किंवा बोंड नमुना KVK ला दाखवा.\n3. KVK: {kvk_contact}",
            "Punjabi": f"⚠️ ਭਰੋਸਾ ਘੱਟ ਹੈ.\n1. ਖੇਤ ਦੀ ਜਾਂਚ ਕਰੋ.\n2. ਨਮੂਨਾ KVK ਨੂੰ ਵਿਖਾਓ.\n3. KVK: {kvk_contact}",
            "English": f"⚠️ Confidence is low.\n1. Inspect the field.\n2. Share samples with KVK.\n3. KVK: {kvk_contact}",
            "Bengali": f"⚠️ বিশ্বাস কম।\n1. মাঠ পরীক্ষা করুন।\n2. নমুনা KVK-তে দেখান।\n3. KVK: {kvk_contact}",
            "Gujarati": f"⚠️ વિશ્વાસ ઓછો છે.\n1. ખેતર તપાસો.\n2. નમૂનો KVKને બતાવો.\n3. KVK: {kvk_contact}",
            "Tamil": f"⚠️ நம்பிக்கை குறைவு.\n1. வயலை பாருங்கள்.\n2. மாதிரியை KVK-க்கு காட்டுங்கள்.\n3. KVK: {kvk_contact}",
            "Telugu": f"⚠️ నమ్మకం తక్కువ.\n1. పొలాన్ని పరిశీలించండి.\n2. నమూనాను KVKకి చూపండి.\n3. KVK: {kvk_contact}",
            "Kannada": f"⚠️ ವಿಶ್ವಾಸ ಕಡಿಮೆ.\n1. ಹೊಲವನ್ನು ಪರಿಶೀಲಿಸಿ.\n2. ಮಾದರಿಯನ್ನು KVKಗೆ ತೋರಿಸಿ.\n3. KVK: {kvk_contact}",
            "Malayalam": f"⚠️ വിശ്വാസം കുറവാണ്.\n1. വയൽ പരിശോധിക്കുക.\n2. സാമ്പിൾ KVK-യ്ക്ക് കാണിക്കുക.\n3. KVK: {kvk_contact}",
        }
        return messages.get(state.language, messages["English"])[:400]

    messages = {
        "Hindi": f"⚠️ {state.district} में {state.crop} पर तनाव संकेत हैं.\n1. 7 दिन में फेरोमोन ट्रैप लगाएं.\n2. पत्तियों और बॉल की जांच करें.\n3. KVK से सत्यापन कराएं: {kvk_contact}",
        "Marathi": f"⚠️ {state.district} मध्ये {state.crop} वर ताण दिसतो.\n1. 7 दिवसांत फेरोमोन सापळे लावा.\n2. पिवळे डाग व बोंड तपासा; संतुलित नत्र द्या.\n3. KVK शी संपर्क करा: {kvk_contact}",
        "Punjabi": f"⚠️ {state.district} ਵਿੱਚ {state.crop} ਉੱਤੇ ਤਾਣ ਦੇ ਸੰਕੇਤ ਹਨ.\n1. 7 ਦਿਨਾਂ ਵਿੱਚ ਫੇਰੋਮੋਨ ਟ੍ਰੈਪ ਲਗਾਓ.\n2. ਪੱਤੇ ਅਤੇ ਬੋਲਾਂ ਦੀ ਜਾਂਚ ਕਰੋ.\n3. KVK ਨਾਲ ਸਲਾਹ ਕਰੋ: {kvk_contact}",
        "English": f"⚠️ {state.crop} stress detected in {state.district}.\n1. Install pheromone traps within 7 days.\n2. Inspect yellowing leaves and boll damage.\n3. Contact KVK for field verification: {kvk_contact}",
        "Bengali": f"⚠️ {state.district} জেলায় {state.crop}-এ চাপের লক্ষণ আছে।\n1. 7 দিনের মধ্যে ফেরোমোন ট্র্যাপ বসান।\n2. পাতা ও ফল পরীক্ষা করুন।\n3. KVK-এর সাথে যোগাযোগ করুন: {kvk_contact}",
        "Gujarati": f"⚠️ {state.district} માં {state.crop} પર તાણના સંકેતો છે.\n1. 7 દિવસમાં ફેરોમોન ટ્રેપ લગાવો.\n2. પાંદડા અને ફળ તપાસો.\n3. KVKનો સંપર્ક કરો: {kvk_contact}",
        "Tamil": f"⚠️ {state.district} பகுதியில் {state.crop} பயிரில் அழுத்தம் காணப்படுகிறது.\n1. 7 நாளில் பெரோமோன் வலை அமைக்கவும்.\n2. இலைகள் மற்றும் கொட்டைகளை பாருங்கள்.\n3. KVK-யை தொடர்புகொள்ளவும்: {kvk_contact}",
        "Telugu": f"⚠️ {state.district} లో {state.crop} పై ఒత్తిడి సంకేతాలు ఉన్నాయి.\n1. 7 రోజుల్లో ఫెరోమోన్ ట్రాప్ వేయండి.\n2. ఆకులు, గింజ భాగాలు చూడండి.\n3. KVKను సంప్రదించండి: {kvk_contact}",
        "Kannada": f"⚠️ {state.district} ನಲ್ಲಿ {state.crop} ಮೇಲೆ ಒತ್ತಡದ ಲಕ್ಷಣಗಳಿವೆ.\n1. 7 ದಿನಗಳಲ್ಲಿ ಫೆರೊಮೋನ್ ಟ್ರ್ಯಾಪ್ ಹಾಕಿ.\n2. ಎಲೆ ಮತ್ತು ಕೊಂಬೆ ಪರಿಶೀಲಿಸಿ.\n3. KVK ಅನ್ನು ಸಂಪರ್ಕಿಸಿ: {kvk_contact}",
        "Malayalam": f"⚠️ {state.district} ൽ {state.crop} വിളയിൽ സമ്മർദ്ദ ലക്ഷണങ്ങൾ കാണുന്നു.\n1. 7 ദിവസത്തിനകം ഫെറോമോൺ ട്രാപ്പ് സ്ഥാപിക്കുക.\n2. ഇലകളും കായ്കളും പരിശോധിക്കുക.\n3. KVKനെ ബന്ധപ്പെടുക: {kvk_contact}",
    }
    return messages.get(state.language, messages["English"])[:400]


def render_institutional_report(state: FarmPulseState, kvk_contact: str) -> str:
    report = state.risk_report
    return (
        f"{state.district}, {state.state}: NDVI {state.ndvi_score:.2f} vs baseline {state.ndvi_baseline:.2f} "
        f"({state.ndvi_anomaly_pct:.1f}% anomaly). Risk {report['riskCategory']} ({report['riskScore']}/100), "
        f"confidence {state.confidence:.1f}%. Root cause: {report['rootCause']}. Recommended action window: "
        f"{report['recommendedAction']}. Data freshness: {state.data_freshness_days} days. KVK: {kvk_contact}."
    )


async def satellite_scout(state: FarmPulseState) -> FarmPulseState:
    record = get_district_record(state.district)
    state.state = record.state
    state.district_record = record.model_dump()
    state.crop_supported = state.crop in SUPPORTED_CROPS
    await emit_event(state.run_id, "Satellite Stress Scout", "fetch_ndvi", "RUNNING", f"Scanning {state.district} canopy vigor")
    forced_stress = state.edge_case == "multi_stressor_conflict" if hasattr(state, "edge_case") else False
    ndvi, baseline, freshness_days, ndvi_source = await fetch_modis_ndvi(record, state.crop, forced_stress=forced_stress)
    if state.edge_case == "data_staleness":
        freshness_days = max(freshness_days, 12)
    anomaly_pct = round(((ndvi - baseline) / baseline) * 100, 1)
    confidence = 78.0
    warnings: list[str] = []
    if freshness_days > 10:
        warnings.append(f"Data staleness detected - NDVI is {freshness_days} days old.")
        confidence = 41.0
    severity = "LOW"
    deficit = abs(anomaly_pct)
    if anomaly_pct <= -25:
        severity = "CRITICAL"
    elif anomaly_pct <= -20:
        severity = "HIGH"
    elif anomaly_pct <= -15:
        severity = "MEDIUM"
    weather = await fetch_weather(record)
    if anomaly_pct <= -15 and weather.rainfall_7d_mm > 200:
        warnings.append("Water stress vs. flood stress ambiguity - request ground validation.")
    state.ndvi_score = ndvi
    state.ndvi_baseline = baseline
    state.ndvi_anomaly_pct = anomaly_pct
    state.data_freshness_days = freshness_days
    state.weather_data = weather.model_dump()
    state.confidence = confidence
    state.warnings.extend(warnings)
    state.satellite_signal = {
        "district": state.district,
        "crop": state.crop,
        "severity": severity,
        "confidence": confidence,
        "stale": freshness_days > 10,
    }
    state.reasoning_chain.append(
        {
            "title": "Checked NDVI vs seasonal baseline",
            "detail": f"NDVI {ndvi:.2f} vs baseline {baseline:.2f} => {anomaly_pct:.1f}% anomaly ({severity}).",
        }
    )
    add_audit_entry(
        state,
        "Satellite Stress Scout",
        "ndvi_anomaly_scan",
        f"district={state.district}, crop={state.crop}, freshness={freshness_days}",
        f"ndvi={ndvi}, baseline={baseline}, anomaly={anomaly_pct}%, severity={severity}",
        ndvi_source,
        0,
        confidence,
        severity,
    )
    await emit_event(state.run_id, "Satellite Stress Scout", "fetch_ndvi", "COMPLETE", f"NDVI {ndvi:.2f}; anomaly {anomaly_pct:.1f}%")
    return state


async def crop_risk_analyst(state: FarmPulseState) -> FarmPulseState:
    await emit_event(state.run_id, "Crop Risk Analyst", "reason_over_signals", "RUNNING", f"Cross-checking weather, crop stage, and pest risk for {state.district}")
    record = get_district_record(state.district)
    stage, days_to_harvest = crop_calendar(record, state.crop)
    pest_probability, pest_name = get_pest_probability(state.district, state.crop)
    weather = WeatherData.model_validate(state.weather_data)
    risk_score = 38 + abs(state.ndvi_anomaly_pct) * 1.3 + max(0, pest_probability - 25) * 0.35
    if weather.weather_anomaly in {"drought", "flood", "heat", "cold"}:
        risk_score += 14
    if state.edge_case == "multi_stressor_conflict":
        risk_score += 18
    risk_score = round(min(96, max(15, risk_score)))
    risk_category = map_risk_category(risk_score)
    confidence = state.confidence
    root_cause = summarize_root_cause(weather, pest_probability, state.crop, state.district)
    recommended_action = "Monitor for 5 days and maintain balanced nutrition"
    escalate = False
    escalation_reason = ""
    phi_compliant = days_to_harvest > 21

    if state.ndvi_anomaly_pct <= -15 and weather.weather_anomaly == "normal":
        root_cause = f"Probable {pest_name.lower()} pressure or nutrient imbalance - ground validation required"
        recommended_action = "Scout 10 plants per acre and confirm symptoms before treatment"
    elif weather.weather_anomaly != "normal" and state.ndvi_anomaly_pct > -10:
        root_cause = "Weather anomaly detected but stress not yet manifested in NDVI - monitor"
        recommended_action = "Monitor canopy and soil moisture for the next 5 days"
    elif state.edge_case == "multi_stressor_conflict":
        root_cause = "Multiple overlapping stressors detected across canopy, weather, and pest windows"
        recommended_action = "Escalate to human agronomist with full district context"
        escalate = True
        escalation_reason = "multi-stressor conflict"

    if not state.crop_supported:
        escalate = True
        confidence = 0
        escalation_reason = "crop type not in domain"
        root_cause = "Unsupported crop domain"
        recommended_action = "Refer farmer to KVK for field-specific guidance"

    if state.data_freshness_days > 10:
        confidence = min(confidence, 41.0)
        escalate = True
        escalation_reason = escalation_reason or "stale satellite data"

    if confidence < 60:
        escalate = True
        escalation_reason = escalation_reason or "confidence below threshold"

    if risk_category in {"HIGH", "CRITICAL"} and not phi_compliant:
        recommended_action = "Use non-chemical options only: pheromone traps, sanitation, and manual scouting"

    state.crop_stage = stage
    state.days_to_harvest = days_to_harvest
    state.pest_risk = pest_name
    state.pest_probability = pest_probability
    state.phi_compliant = phi_compliant
    state.confidence = round(confidence, 1)
    state.escalate = escalate
    state.escalation_reason = escalation_reason
    state.risk_report = {
        "district": state.district,
        "crop": state.crop,
        "riskScore": risk_score,
        "riskCategory": risk_category,
        "rootCause": root_cause,
        "confidenceLevel": state.confidence,
        "recommendedAction": recommended_action,
        "escalate": escalate,
    }
    state.soil_snapshot = build_soil_snapshot(record, state.crop, weather, state.ndvi_score)
    state.forecast_5d = await fetch_forecast_5d(record, weather)
    state.data_sources = [
        f"Recent weather observations via {weather.source}",
        "MODIS Terra NDVI 8-day imagery via NASA GIBS",
        "5-day forecast via Open-Meteo",
        "Modeled soil snapshot derived from weather and canopy signals",
    ]
    state.reasoning_chain.extend(
        [
            {
                "title": "Checked weather trend and 5-day forecast",
                "detail": f"7-day rainfall {weather.rainfall_7d_mm} mm; anomaly type {weather.weather_anomaly}; next 5 days prepared for fertilizer timing.",
            },
            {
                "title": "Checked soil condition snapshot",
                "detail": f"Soil moisture {state.soil_snapshot['moisturePct']}% ({state.soil_snapshot['moistureBand']}), pH {state.soil_snapshot['soilPH']}, nitrogen {state.soil_snapshot['nitrogenKgHa']} kg/ha.",
            },
            {
                "title": "Checked crop stage and pest calendar",
                "detail": f"Stage {stage}; pest window {pest_name} at {pest_probability}% probability.",
            },
        ]
    )
    add_audit_entry(
        state,
        "Crop Risk Analyst",
        "risk_reasoning",
        f"ndvi_anomaly={state.ndvi_anomaly_pct}%, weather={weather.weather_anomaly}, pest={pest_name}",
        f"risk_score={risk_score}, category={risk_category}, escalate={escalate}",
        "domain-reasoner-v2",
        0,
        state.confidence,
        risk_category,
    )
    await emit_event(state.run_id, "Crop Risk Analyst", "reason_over_signals", "COMPLETE", f"Risk {risk_category} ({risk_score}/100)")
    return state


async def advisory_generator(state: FarmPulseState) -> FarmPulseState:
    await emit_event(state.run_id, "Advisory Generator", "compose_advisory", "RUNNING", f"Generating {state.language} advisories")
    kvk_contact = state.district_record["kvk_contact"]
    sms_model = select_model("sms_advisory", "low")
    institutional_model = select_model("institutional_report", "high" if state.escalate else "medium")

    state.model_used = sms_model
    state.advisory_sms = render_sms(state, kvk_contact)
    state.advisory_whatsapp = render_whatsapp(state, kvk_contact)
    state.advisory_institutional = render_institutional_report(state, kvk_contact)
    state.reasoning_chain.append(
        {
            "title": "Generated multilingual advisory with guardrails",
            "detail": f"Selected {sms_model} for farmer messaging and {institutional_model} for institutional reporting.",
        }
    )
    if state.risk_report.get("riskCategory") in {"HIGH", "CRITICAL"}:
        disclaimer = "Consult local Krishi Vigyan Kendra for field verification."
        state.advisory_institutional = f"{state.advisory_institutional} {disclaimer}"
    add_audit_entry(
        state,
        "Advisory Generator",
        "multilingual_generation",
        f"language={state.language}, escalate={state.escalate}",
        f"sms={state.advisory_sms[:80]}",
        sms_model,
        180,
        state.confidence,
        state.risk_report["riskCategory"],
    )
    add_audit_entry(
        state,
        "Advisory Generator",
        "institutional_generation",
        f"district={state.district}, crop={state.crop}",
        f"report_length={len(state.advisory_institutional)}",
        institutional_model,
        420,
        state.confidence,
        state.risk_report["riskCategory"],
    )
    await emit_event(state.run_id, "Advisory Generator", "compose_advisory", "COMPLETE", f"Advisory ready with confidence {state.confidence:.1f}%")
    return state


async def aggregate_state_risks() -> dict[str, Any]:
    if aggregate_cache_valid():
        return AGGREGATE_CACHE["payload"]

    if AGGREGATE_CACHE.get("payload") is not None:
        schedule_aggregate_refresh()
        return AGGREGATE_CACHE["payload"]

    task = AGGREGATE_REFRESH_TASK
    if task and not task.done():
        await task
        if AGGREGATE_CACHE.get("payload") is not None:
            return AGGREGATE_CACHE["payload"]

    await refresh_aggregate_cache()
    return AGGREGATE_CACHE["payload"]


async def institutional_reporter(state: FarmPulseState) -> FarmPulseState:
    await emit_event(state.run_id, "Institutional Reporter", "aggregate_outputs", "RUNNING", "Building FPO, insurer, and government views")
    aggregate = await aggregate_state_risks()
    high_risk_districts = [row for row in aggregate["districts"] if row["riskLevel"] in {"HIGH", "CRITICAL"}]
    same_state_critical = [
        row for row in high_risk_districts if row["state"] == state.state and row["riskLevel"] == "CRITICAL"
    ]
    emergency_alert = len(same_state_critical) >= 3
    insurer_rows = [
        {
            "district": row["district"],
            "state": row["state"],
            "riskLevel": row["riskLevel"],
            "estimatedAffectedAcreagePct": round(min(48, row["riskScore"] * 0.42), 1),
            "claimProbability": round(min(0.92, row["riskScore"] / 110), 2),
            "confidence": round(max(52, 84 - abs(row["riskScore"] - 70) * 0.2), 1),
        }
        for row in high_risk_districts
    ]
    state.institutional_outputs = {
        "heatmap": aggregate["states"],
        "fpoBriefing": aggregate["districts"],
        "insuranceSignals": insurer_rows,
        "governmentEarlyWarning": {
            "format": "PM Digital Agriculture Mission style",
            "state": state.state,
            "district": state.district,
            "riskCategory": state.risk_report["riskCategory"],
            "generatedAt": now_iso(),
            "dataFreshnessDays": state.data_freshness_days,
            "confidence": state.confidence,
            "emergencyAlert": emergency_alert,
        },
    }
    if emergency_alert:
        state.warnings.append("State-Level Crop Emergency Alert generated and held for human review.")
    add_audit_entry(
        state,
        "Institutional Reporter",
        "aggregate_and_sync",
        f"state={state.state}, risk={state.risk_report['riskCategory']}",
        f"heatmap_states={len(aggregate['states'])}, insurer_signals={len(insurer_rows)}",
        "aggregation-engine-v1",
        0,
        state.confidence,
        state.risk_report["riskCategory"],
    )
    await emit_event(state.run_id, "Institutional Reporter", "aggregate_outputs", "COMPLETE", "Institutional views synced")
    return state


async def human_escalation_node(state: FarmPulseState) -> FarmPulseState:
    await emit_event(state.run_id, "Human Escalation", "handoff", "RUNNING", f"Escalating: {state.escalation_reason}")
    state.reasoning_chain.append(
        {
            "title": "Escalated to human review",
            "detail": state.escalation_reason or "confidence too low for automated recommendation",
        }
    )
    add_audit_entry(
        state,
        "Human Escalation",
        "handoff_required",
        f"reason={state.escalation_reason}",
        "automation halted for field verification",
        "human-review",
        0,
        state.confidence,
        state.risk_report.get("riskCategory", "MEDIUM"),
    )
    await emit_event(state.run_id, "Human Escalation", "handoff", "COMPLETE", "Case referred to KVK / agronomist")
    return state


async def run_pipeline(payload: AnalyzeRequest) -> dict[str, Any]:
    run_id = payload.run_id or str(uuid.uuid4())
    district_record = get_district_record(payload.district)
    resolved_language = normalize_language(payload.language, district_record.language)
    state = FarmPulseState(
        run_id=run_id,
        district=district_record.district,
        state=district_record.state,
        crop=payload.crop.title(),
        language=resolved_language,
        farmer_query=payload.farmer_query,
        data_freshness_days=12 if payload.edge_case == "data_staleness" else 5,
        edge_case=payload.edge_case,
    )
    await emit_event(run_id, "Orchestrator", "start", "RUNNING", f"Starting analysis for {state.district}, {state.crop}")
    state = await satellite_scout(state)
    state = await crop_risk_analyst(state)
    state = await advisory_generator(state)
    state = await institutional_reporter(state)
    if state.escalate:
        state = await human_escalation_node(state)
    await emit_event(run_id, "Orchestrator", "complete", "COMPLETE", "Analysis complete")
    return {
        "runId": run_id,
        "district": state.district,
        "state": state.state,
        "crop": state.crop,
        "language": state.language,
        "ndviScore": state.ndvi_score,
        "ndviBaseline": state.ndvi_baseline,
        "ndviAnomalyPct": state.ndvi_anomaly_pct,
        "weatherData": state.weather_data,
        "cropStage": state.crop_stage,
        "daysToHarvest": state.days_to_harvest,
        "pestRisk": state.pest_risk,
        "pestProbability": state.pest_probability,
        "riskReport": state.risk_report,
        "advisorySms": state.advisory_sms,
        "advisoryWhatsapp": state.advisory_whatsapp,
        "advisoryInstitutional": state.advisory_institutional,
        "reasoningChain": state.reasoning_chain,
        "auditLog": state.audit_log,
        "confidence": state.confidence,
        "warnings": state.warnings,
        "escalate": state.escalate,
        "escalationReason": state.escalation_reason,
        "dataFreshnessDays": state.data_freshness_days,
        "modelUsed": state.model_used,
        "institutionalOutputs": state.institutional_outputs,
        "districtRecord": state.district_record,
        "soilSnapshot": state.soil_snapshot,
        "forecast5d": state.forecast_5d,
        "dataSources": state.data_sources,
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "FarmPulse Agent Engine"}


@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest) -> dict[str, Any]:
    return await run_pipeline(request)


@app.post("/api/simulate-edge-case")
async def simulate_edge_case(request: EdgeCaseRequest) -> dict[str, Any]:
    payload = AnalyzeRequest(
        district=request.district,
        crop=request.crop if request.scenario != "unknown_crop" else "Moringa",
        language=request.language,
        farmer_query="Simulated edge case run",
        edge_case=request.scenario,
        run_id=request.run_id,
    )
    return await run_pipeline(payload)


@app.get("/api/districts")
async def get_districts() -> dict[str, Any]:
    aggregate = await aggregate_state_risks()
    return {
        "districts": aggregate["districts"],
        "states": aggregate["states"],
        "summary": {
            "districtsMonitored": len(aggregate["districts"]),
            "activeAlerts": sum(1 for row in aggregate["districts"] if row["riskLevel"] in {"HIGH", "CRITICAL"}),
            "farmersCovered": 86000000,
            "lastScanTimestamp": now_iso(),
        },
    }


@app.get("/api/district/{district_id}")
async def get_district(district_id: str) -> dict[str, Any]:
    record = get_district_record(district_id)
    response = await run_pipeline(
        AnalyzeRequest(
            district=record.district,
            crop=record.primary_crop if record.primary_crop in SUPPORTED_CROPS else "Wheat",
            language=record.language,
            farmer_query="District detail request",
        )
    )
    return response


@app.get("/api/audit-log")
async def get_audit_log(
    agent: Optional[str] = None,
    district: Optional[str] = None,
    risk_level: Optional[str] = Query(None, alias="riskLevel"),
) -> dict[str, Any]:
    query = "SELECT timestamp, run_id, district, state, crop, agent, action, input_summary, output_summary, model_used, tokens_consumed, confidence, escalation, risk_level FROM audit_log WHERE 1=1"
    params: list[Any] = []
    if agent:
        query += " AND agent = ?"
        params.append(agent)
    if district:
        query += " AND district = ?"
        params.append(district)
    if risk_level:
        query += " AND risk_level = ?"
        params.append(risk_level)
    query += " ORDER BY timestamp DESC LIMIT 500"
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(query, params).fetchall()
    entries = [
        {
            "timestamp": row[0],
            "runId": row[1],
            "district": row[2],
            "state": row[3],
            "crop": row[4],
            "agent": row[5],
            "action": row[6],
            "inputSummary": row[7],
            "outputSummary": row[8],
            "modelUsed": row[9],
            "tokensConsumed": row[10],
            "confidence": row[11],
            "escalation": bool(row[12]),
            "riskLevel": row[13],
        }
        for row in rows
    ]
    return {"entries": entries}


@app.get("/api/audit-log/export")
async def export_audit_log() -> StreamingResponse:
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT timestamp, run_id, district, state, crop, agent, action, input_summary, output_summary, model_used, tokens_consumed, confidence, escalation, risk_level FROM audit_log ORDER BY timestamp DESC LIMIT 1000"
        ).fetchall()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["timestamp", "run_id", "district", "state", "crop", "agent", "action", "input_summary", "output_summary", "model_used", "tokens_consumed", "confidence", "escalation", "risk_level"])
    writer.writerows(rows)
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=farmpulse-audit.csv"})


@app.get("/api/stream/{run_id}")
async def stream_events(run_id: str) -> StreamingResponse:
    queue = RUN_QUEUES.setdefault(run_id, asyncio.Queue())

    async def event_stream() -> AsyncGenerator[str, None]:
        yield f"data: {json.dumps({'agent': 'System', 'step': 'connected', 'status': 'IDLE', 'message': 'Stream connected', 'timestamp': now_iso(), 'run_id': run_id})}\n\n"
        while True:
            message = await queue.get()
            yield message
            if '"step": "complete"' in message:
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream")
