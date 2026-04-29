from __future__ import annotations

from typing import Any, Dict

VEHICLE_RULES: Dict[str, Dict[str, Any]] = {
    "Camión Jaula": {
        "kg_min": 10000,
        "kg_max": 30000,
        "kg_default": 20000,
        "bovinos_min": 15,
        "bovinos_max": 30,
        "bovinos_default": 22,
        "descripcion": "Transporte ganadero con ventilación y varios niveles.",
        "aliases": [],
    },
    "Camión de Estacas con Carpa": {
        "kg_min": 3000,
        "kg_max": 15000,
        "kg_default": 9000,
        "bovinos_min": 4,
        "bovinos_max": 12,
        "bovinos_default": 8,
        "descripcion": "Protege del clima y reduce el riesgo de lesiones.",
        "aliases": ["Camión Estacas con Carpa"],
    },
    "Tracción Animal": {
        "kg_min": 500,
        "kg_max": 1000,
        "kg_default": 750,
        "bovinos_min": 1,
        "bovinos_max": 1,
        "bovinos_default": 1,
        "descripcion": "Opción rural para cargas pequeñas.",
        "aliases": [],
    },
    "Camión Plataforma Especial": {
        "kg_min": 5000,
        "kg_max": 20000,
        "kg_default": 12500,
        "bovinos_min": 6,
        "bovinos_max": 18,
        "bovinos_default": 12,
        "descripcion": "Ideal para animales grandes con rampas seguras.",
        "aliases": [],
    },
}

ALIASES = {
    alias: canonical
    for canonical, config in VEHICLE_RULES.items()
    for alias in config.get("aliases", [])
}


def normalize_vehicle_type(tipo_vehiculo: str | None) -> str:
    tipo = (tipo_vehiculo or "").strip()
    if not tipo:
        return ""
    return ALIASES.get(tipo, tipo)



def get_vehicle_rule(tipo_vehiculo: str | None):
    tipo_normalizado = normalize_vehicle_type(tipo_vehiculo)
    return VEHICLE_RULES.get(tipo_normalizado)



def validate_vehicle_ranges(tipo_vehiculo: str | None, peso_max_prom: float, capacidad_bovinos: int):
    tipo_normalizado = normalize_vehicle_type(tipo_vehiculo)
    config = get_vehicle_rule(tipo_normalizado)

    if not config:
        tipos_permitidos = ", ".join(VEHICLE_RULES.keys())
        raise ValueError(f"Tipo de vehículo no válido. Usa uno de estos valores: {tipos_permitidos}")

    if peso_max_prom < config["kg_min"] or peso_max_prom > config["kg_max"]:
        raise ValueError(
            f"La carga máxima permitida ({peso_max_prom} kg) no corresponde al tipo de vehículo. "
            f"Para {tipo_normalizado} el rango permitido es de {config['kg_min']} a {config['kg_max']} kg."
        )

    if capacidad_bovinos < config["bovinos_min"] or capacidad_bovinos > config["bovinos_max"]:
        raise ValueError(
            f"La capacidad de bovinos ({capacidad_bovinos}) no corresponde al tipo de vehículo. "
            f"Para {tipo_normalizado} el rango permitido es de {config['bovinos_min']} a {config['bovinos_max']} bovinos."
        )

    return tipo_normalizado, config
