from __future__ import annotations

from typing import Optional

VEREDAS_ZIPAQUIRA = [
    "Barandillas",
    "Barro Blanco",
    "El Empalizado",
    "El Tunal",
    "La Granja",
    "Pasoancho",
    "Río Frío",
    "San Isidro",
    "San Jorge",
    "San Miguel",
    "Ventalarga",
    "Portachuelo",
    "El Cedro",
    "Zipaquirá",
]

DISTANCIAS_KM = {
    "Barandillas": {"Barandillas": 0.0, "Barro Blanco": 12.6, "El Empalizado": 22.4, "El Tunal": 5.7, "La Granja": 3.6, "Pasoancho": 5.5, "Río Frío": 11.8, "San Isidro": 11.7, "San Jorge": 7.5, "San Miguel": 3.6, "Ventalarga": 18.8, "Portachuelo": 6.2, "El Cedro": 5.3, "Zipaquirá": 4.6},
    "Barro Blanco": {"Barandillas": 16.2, "Barro Blanco": 0.0, "El Empalizado": 23.5, "El Tunal": 21.2, "La Granja": 17.8, "Pasoancho": 13.5, "Río Frío": 7.8, "San Isidro": 1.4, "San Jorge": 5.1, "San Miguel": 19.1, "Ventalarga": 19.8, "Portachuelo": 7.7, "El Cedro": 8.3, "Zipaquirá": 6.8},
    "El Empalizado": {"Barandillas": 20.2, "Barro Blanco": 10.1, "El Empalizado": 0.0, "El Tunal": 25.2, "La Granja": 21.8, "Pasoancho": 20.4, "Río Frío": 10.8, "San Isidro": 21.2, "San Jorge": 20.7, "San Miguel": 23.2, "Ventalarga": 2.4, "Portachuelo": 18.4, "El Cedro": 16.0, "Zipaquirá": 15.6},
    "El Tunal": {"Barandillas": 5.7, "Barro Blanco": 17.6, "El Empalizado": 26.4, "El Tunal": 0.0, "La Granja": 8.6, "Pasoancho": 10.5, "Río Frío": 15.8, "San Isidro": 16.7, "San Jorge": 16.1, "San Miguel": 1.4, "Ventalarga": 22.8, "Portachuelo": 12.4, "El Cedro": 10.2, "Zipaquirá": 9.6},
    "La Granja": {"Barandillas": 3.6, "Barro Blanco": 6.4, "El Empalizado": 23.0, "El Tunal": 8.6, "La Granja": 0.0, "Pasoancho": 7.1, "Río Frío": 12.4, "San Isidro": 13.3, "San Jorge": 9.2, "San Miguel": 6.5, "Ventalarga": 19.4, "Portachuelo": 9.0, "El Cedro": 6.9, "Zipaquirá": 6.2},
    "Pasoancho": {"Barandillas": 5.2, "Barro Blanco": 9.9, "El Empalizado": 21.9, "El Tunal": 10.2, "La Granja": 6.8, "Pasoancho": 0.0, "Río Frío": 11.3, "San Isidro": 9.0, "San Jorge": 4.8, "San Miguel": 8.1, "Ventalarga": 18.2, "Portachuelo": 4.7, "El Cedro": 6.7, "Zipaquirá": 5.2},
    "Río Frío": {"Barandillas": 10.8, "Barro Blanco": 7.9, "El Empalizado": 12.0, "El Tunal": 15.8, "La Granja": 12.4, "Pasoancho": 11.0, "Río Frío": 0.0, "San Isidro": 7.0, "San Jorge": 7.9, "San Miguel": 13.8, "Ventalarga": 8.4, "Portachuelo": 9.3, "El Cedro": 6.6, "Zipaquirá": 6.2},
    "San Isidro": {"Barandillas": 13.5, "Barro Blanco": 15.4, "El Empalizado": 8.0, "El Tunal": 10.2, "La Granja": 15.0, "Pasoancho": 13.7, "Río Frío": 4.0, "San Isidro": 0.0, "San Jorge": 10.3, "San Miguel": 14.2, "Ventalarga": 4.3, "Portachuelo": 14.3, "El Cedro": 9.2, "Zipaquirá": 8.8},
    "San Jorge": {"Barandillas": 11.0, "Barro Blanco": 5.0, "El Empalizado": 18.4, "El Tunal": 16.0, "La Granja": 17.0, "Pasoancho": 8.4, "Río Frío": 7.8, "San Isidro": 16.9, "San Jorge": 0.0, "San Miguel": 14.0, "Ventalarga": 14.8, "Portachuelo": 6.2, "El Cedro": 3.3, "Zipaquirá": 1.8},
    "San Miguel": {"Barandillas": 3.6, "Barro Blanco": 15.6, "El Empalizado": 24.4, "El Tunal": 1.4, "La Granja": 6.5, "Pasoancho": 8.5, "Río Frío": 13.8, "San Isidro": 16.4, "San Jorge": 10.5, "San Miguel": 0.0, "Ventalarga": 20.7, "Portachuelo": 9.0, "El Cedro": 8.2, "Zipaquirá": 7.5},
    "Ventalarga": {"Barandillas": 17.8, "Barro Blanco": 20.0, "El Empalizado": 3.7, "El Tunal": 22.8, "La Granja": 19.4, "Pasoancho": 18.0, "Río Frío": 8.4, "San Isidro": 4.3, "San Jorge": 14.9, "San Miguel": 20.0, "Ventalarga": 0.0, "Portachuelo": 18.6, "El Cedro": 13.5, "Zipaquirá": 13.2},
    "Portachuelo": {"Barandillas": 9.0, "Barro Blanco": 10.3, "El Empalizado": 22.3, "El Tunal": 14.0, "La Granja": 10.6, "Pasoancho": 6.3, "Río Frío": 11.6, "San Isidro": 9.3, "San Jorge": 5.2, "San Miguel": 12.0, "Ventalarga": 18.6, "Portachuelo": 0.0, "El Cedro": 7.0, "Zipaquirá": 5.6},
    "El Cedro": {"Barandillas": 5.6, "Barro Blanco": 23.0, "El Empalizado": 17.8, "El Tunal": 10.6, "La Granja": 7.2, "Pasoancho": 6.3, "Río Frío": 7.2, "San Isidro": 9.8, "San Jorge": 3.0, "San Miguel": 8.5, "Ventalarga": 14.0, "Portachuelo": 6.9, "El Cedro": 0.0, "Zipaquirá": 1.2},
    "Zipaquirá": {"Barandillas": 4.6, "Barro Blanco": 6.9, "El Empalizado": 16.8, "El Tunal": 9.6, "La Granja": 6.2, "Pasoancho": 4.8, "Río Frío": 6.2, "San Isidro": 6.0, "San Jorge": 1.9, "San Miguel": 7.5, "Ventalarga": 13.2, "Portachuelo": 3.2, "El Cedro": 1.2, "Zipaquirá": 0.0},
}

KM_MINIMOS = 7.0
VALOR_MINIMO = 80000.0
VALOR_POR_KM_ADICIONAL = 11200.0


def normalizar_vereda(value: Optional[str]) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    mapping = {
        "Zipaquira": "Zipaquirá",
        "Centro": "Zipaquirá",
        "Zipaquirá (Centro)": "Zipaquirá",
        "Vereda El Empalizado": "El Empalizado",
        "Vereda Pasoancho": "Pasoancho",
        "Vereda San Jorge": "San Jorge",
        "Vereda La Fuente": "La Granja",
    }
    return mapping.get(text, text)


def vereda_permitida(value: Optional[str]) -> bool:
    return normalizar_vereda(value) in VEREDAS_ZIPAQUIRA


def obtener_distancia(origen: Optional[str], destino: Optional[str]) -> float:
    origen_n = normalizar_vereda(origen)
    destino_n = normalizar_vereda(destino)
    if origen_n not in DISTANCIAS_KM or destino_n not in DISTANCIAS_KM[origen_n]:
        raise ValueError("No existe una distancia configurada para la ruta seleccionada")
    return float(DISTANCIAS_KM[origen_n][destino_n])


def calcular_tarifa_minima(origen: Optional[str], destino: Optional[str]) -> dict:
    distancia = obtener_distancia(origen, destino)
    tarifa = VALOR_MINIMO if distancia <= KM_MINIMOS else VALOR_MINIMO + ((distancia - KM_MINIMOS) * VALOR_POR_KM_ADICIONAL)
    return {
        "origen": normalizar_vereda(origen),
        "destino": normalizar_vereda(destino),
        "distancia_km": round(distancia, 1),
        "tarifa_minima": round(float(tarifa), 2),
        "km_minimos": KM_MINIMOS,
        "valor_minimo": VALOR_MINIMO,
        "valor_por_km_adicional": VALOR_POR_KM_ADICIONAL,
    }
