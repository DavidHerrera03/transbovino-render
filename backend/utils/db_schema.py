from sqlalchemy import text
from sqlalchemy.orm import Session

from utils.tarifas import VEREDAS_ZIPAQUIRA as VEREDAS_PERMITIDAS

TABLE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS finca (
        id_finca INTEGER PRIMARY KEY AUTO_INCREMENT,
        municipio VARCHAR(100) NOT NULL DEFAULT 'Zipaquira',
        vereda VARCHAR(120) NOT NULL,
        referencia TEXT NOT NULL,
        id_usuario INTEGER NOT NULL,
        nombre_finca VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS vehiculo (
        id_vehiculo INTEGER PRIMARY KEY AUTO_INCREMENT,
        id_usuario INTEGER NOT NULL,
        tipo_vehiculo VARCHAR(120) NOT NULL,
        marca VARCHAR(120) NOT NULL DEFAULT 'Sin marca',
        modelo INTEGER NOT NULL,
        peso_max_prom FLOAT NOT NULL,
        capacidad_bovinos INTEGER NOT NULL DEFAULT 1,
        descripcion TEXT NOT NULL,
        placa VARCHAR(20) NOT NULL,
        INDEX idx_vehiculo_usuario (id_usuario)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS bovino_movimiento (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        id_bovino INTEGER NOT NULL,
        tipo_movimiento VARCHAR(30) NOT NULL,
        id_usuario_origen INTEGER NULL,
        id_usuario_destino INTEGER NULL,
        id_finca_origen INTEGER NULL,
        id_finca_destino INTEGER NULL,
        solicitud_id INTEGER NULL,
        fecha DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        observacion TEXT NULL,
        INDEX idx_mov_bovino (id_bovino),
        INDEX idx_mov_solicitud (solicitud_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS documentacion_vehiculo (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        id_vehiculo INTEGER NOT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        ruta_archivo VARCHAR(500) NOT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_documentacion_vehiculo (id_vehiculo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,

    """
    CREATE TABLE IF NOT EXISTS documentacion_bovino (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        id_bovino INTEGER NOT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        ruta_archivo VARCHAR(500) NOT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_documentacion_bovino (id_bovino)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS solicitudes (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        codigo VARCHAR(30) NULL,
        tipo_solicitud VARCHAR(50) NOT NULL DEFAULT 'Venta',
        origen VARCHAR(255) NOT NULL,
        destino VARCHAR(255) NOT NULL,
        fecha VARCHAR(50) NULL,
        hora_recogida VARCHAR(20) NULL,
        contacto_entrega VARCHAR(120) NULL,
        telefono_contacto VARCHAR(30) NULL,
        estado VARCHAR(50) NOT NULL DEFAULT 'Buscando conductor',
        observaciones TEXT NULL,
        observaciones_ganado TEXT NULL,
        guia_movilidad_nombre VARCHAR(255) NOT NULL,
        guia_movilidad_ruta TEXT NOT NULL,
        info_adicional_nombre VARCHAR(255) NULL,
        info_adicional_ruta TEXT NULL,
        id_usuario INTEGER NOT NULL,
        id_transportador INTEGER NULL,
        id_vehiculo INTEGER NULL,
        id_finca_origen INTEGER NULL,
        id_finca_destino INTEGER NULL,
        destino_confirmado TINYINT(1) NOT NULL DEFAULT 0,
        destino_rechazado TINYINT(1) NOT NULL DEFAULT 0,
        destino_es_tercero TINYINT(1) NOT NULL DEFAULT 0,
        accion_bovino VARCHAR(30) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_solicitudes_usuario (id_usuario),
        INDEX idx_solicitudes_transportador (id_transportador),
        INDEX idx_solicitudes_vehiculo (id_vehiculo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS solicitud_bovino (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INTEGER NOT NULL,
        bovino_id INTEGER NOT NULL,
        INDEX idx_solicitud_bovino_solicitud (solicitud_id),
        INDEX idx_solicitud_bovino_bovino (bovino_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS solicitud_oferta (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INTEGER NOT NULL,
        transportador_id INTEGER NOT NULL,
        valor_oferta FLOAT NOT NULL,
        estado VARCHAR(40) NOT NULL DEFAULT 'pendiente_transportador',
        propuesta_por VARCHAR(20) NOT NULL DEFAULT 'campesino',
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_solicitud_oferta_transportador (solicitud_id, transportador_id),
        INDEX idx_solicitud_oferta_solicitud (solicitud_id),
        INDEX idx_solicitud_oferta_transportador (transportador_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS solicitud_rechazo (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INTEGER NOT NULL,
        transportador_id INTEGER NOT NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_solicitud_transportador (solicitud_id, transportador_id),
        INDEX idx_solicitud_rechazo_transportador (transportador_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS viajes (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        solicitud_id INTEGER NULL,
        id_transportador INTEGER NULL,
        id_vehiculo INTEGER NULL,
        origen VARCHAR(255) NULL,
        destino VARCHAR(255) NULL,
        fecha VARCHAR(50) NULL,
        estado VARCHAR(50) NULL,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_viajes_transportador (id_transportador),
        INDEX idx_viajes_solicitud (solicitud_id),
        INDEX idx_viajes_vehiculo (id_vehiculo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    """,
]

COLUMN_DEFINITIONS = {
    "bovino": {
        "id_finca": "INTEGER NULL",
    },
    "finca": {
        "municipio": "VARCHAR(100) NOT NULL DEFAULT 'Zipaquira'",
        "vereda": "VARCHAR(120) NOT NULL DEFAULT 'Zipaquira'",
        "referencia": "TEXT NULL",
        "nombre_finca": "VARCHAR(150) NOT NULL DEFAULT 'Mi finca'",
    },
    "vehiculo": {
        "tipo_vehiculo": "VARCHAR(120) NOT NULL",
        "marca": "VARCHAR(120) NOT NULL DEFAULT 'Sin marca'",
        "modelo": "INTEGER NOT NULL",
        "peso_max_prom": "FLOAT NOT NULL",
        "capacidad_bovinos": "INTEGER NOT NULL DEFAULT 1",
        "descripcion": "TEXT NOT NULL",
        "placa": "VARCHAR(20) NOT NULL",
    },
    "documentacion_vehiculo": {
        "id_vehiculo": "INTEGER NOT NULL",
        "nombre_archivo": "VARCHAR(255) NOT NULL",
        "ruta_archivo": "VARCHAR(500) NOT NULL",
        "created_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP",
    },
    "documentacion_bovino": {
        "id_bovino": "INTEGER NOT NULL",
        "nombre_archivo": "VARCHAR(255) NOT NULL",
        "ruta_archivo": "VARCHAR(500) NOT NULL",
        "created_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP",
    },
    "solicitudes": {
        "codigo": "VARCHAR(30) NULL",
        "tipo_solicitud": "VARCHAR(50) NOT NULL DEFAULT 'Venta'",
        "origen": "VARCHAR(255) NOT NULL",
        "destino": "VARCHAR(255) NOT NULL",
        "fecha": "VARCHAR(50) NULL",
        "hora_recogida": "VARCHAR(20) NULL",
        "contacto_entrega": "VARCHAR(120) NULL",
        "telefono_contacto": "VARCHAR(30) NULL",
        "estado": "VARCHAR(50) NOT NULL DEFAULT 'Buscando conductor'",
        "observaciones": "TEXT NULL",
        "observaciones_ganado": "TEXT NULL",
        "guia_movilidad_nombre": "VARCHAR(255) NOT NULL DEFAULT ''",
        "guia_movilidad_ruta": "TEXT NULL",
        "info_adicional_nombre": "VARCHAR(255) NULL",
        "info_adicional_ruta": "TEXT NULL",
        "id_usuario": "INTEGER NOT NULL",
        "id_transportador": "INTEGER NULL",
        "id_vehiculo": "INTEGER NULL",
        "id_finca_origen": "INTEGER NULL",
        "id_finca_destino": "INTEGER NULL",
        "destino_confirmado": "TINYINT(1) NOT NULL DEFAULT 0",
        "destino_rechazado": "TINYINT(1) NOT NULL DEFAULT 0",
        "destino_es_tercero": "TINYINT(1) NOT NULL DEFAULT 0",
        "accion_bovino": "VARCHAR(30) NULL",
        "vereda_origen": "VARCHAR(120) NULL",
        "vereda_destino": "VARCHAR(120) NULL",
        "distancia_km": "FLOAT NULL",
        "tarifa_minima": "FLOAT NULL",
        "valor_referencia_campesino": "FLOAT NULL",
        "created_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP",
        "updated_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    },
    "solicitud_bovino": {
        "solicitud_id": "INTEGER NOT NULL",
        "bovino_id": "INTEGER NOT NULL",
    },
    "solicitud_oferta": {
        "solicitud_id": "INTEGER NOT NULL",
        "transportador_id": "INTEGER NOT NULL",
        "valor_oferta": "FLOAT NOT NULL DEFAULT 0",
        "estado": "VARCHAR(40) NOT NULL DEFAULT 'pendiente_transportador'",
        "propuesta_por": "VARCHAR(20) NOT NULL DEFAULT 'campesino'",
        "created_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP",
        "updated_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    },
    "solicitud_rechazo": {
        "solicitud_id": "INTEGER NOT NULL",
        "transportador_id": "INTEGER NOT NULL",
        "created_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP",
    },
    "viajes": {
        "solicitud_id": "INTEGER NULL",
        "id_transportador": "INTEGER NULL",
        "id_vehiculo": "INTEGER NULL",
        "origen": "VARCHAR(255) NULL",
        "destino": "VARCHAR(255) NULL",
        "fecha": "VARCHAR(50) NULL",
        "estado": "VARCHAR(50) NULL",
        "created_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP",
        "updated_at": "DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    },
}

INDEX_STATEMENTS = [
    "CREATE INDEX idx_solicitudes_estado ON solicitudes (estado)",
    "CREATE INDEX idx_solicitudes_usuario_estado ON solicitudes (id_usuario, estado)",
    "CREATE INDEX idx_solicitudes_vehiculo ON solicitudes (id_vehiculo)",
    "CREATE INDEX idx_viajes_transportador_estado ON viajes (id_transportador, estado)",
    "CREATE INDEX idx_viajes_vehiculo ON viajes (id_vehiculo)",
    "CREATE INDEX idx_vehiculo_usuario ON vehiculo (id_usuario)",
    "CREATE INDEX idx_documentacion_vehiculo ON documentacion_vehiculo (id_vehiculo)",
    "CREATE INDEX idx_documentacion_bovino ON documentacion_bovino (id_bovino)",
    "CREATE INDEX idx_bovino_finca ON bovino (id_finca)",
    "CREATE INDEX idx_finca_usuario ON finca (id_usuario)",
    "CREATE INDEX idx_solicitud_oferta_solicitud ON solicitud_oferta (solicitud_id)",
    "CREATE INDEX idx_solicitud_oferta_transportador ON solicitud_oferta (transportador_id)",
    "CREATE INDEX idx_mov_bovino ON bovino_movimiento (id_bovino)",
    "CREATE INDEX idx_mov_solicitud ON bovino_movimiento (solicitud_id)",
]


def table_exists(db: Session, table_name: str) -> bool:
    result = db.execute(text("SHOW TABLES LIKE :table_name"), {"table_name": table_name}).fetchone()
    return result is not None


def column_exists(db: Session, table_name: str, column_name: str) -> bool:
    result = db.execute(
        text(
            """
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table_name
              AND COLUMN_NAME = :column_name
            LIMIT 1
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    ).fetchone()
    return result is not None


def index_exists(db: Session, table_name: str, index_name: str) -> bool:
    result = db.execute(
        text(
            """
            SELECT INDEX_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table_name
              AND INDEX_NAME = :index_name
            LIMIT 1
            """
        ),
        {"table_name": table_name, "index_name": index_name},
    ).fetchone()
    return result is not None


def ensure_operational_schema(db: Session):
    for statement in TABLE_STATEMENTS:
        db.execute(text(statement))

    for table_name, columns in COLUMN_DEFINITIONS.items():
        if not table_exists(db, table_name):
            continue
        for column_name, definition in columns.items():
            if not column_exists(db, table_name, column_name):
                db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))

    if column_exists(db, 'finca', 'direccion'):
        try:
            db.execute(text('ALTER TABLE finca DROP COLUMN direccion'))
        except Exception:
            db.rollback()

    try:
        db.execute(text("UPDATE finca SET municipio = 'Zipaquira' WHERE municipio IS NULL OR municipio = ''"))
    except Exception:
        db.rollback()

    for statement in INDEX_STATEMENTS:
        tokens = statement.split()
        index_name = tokens[2]
        table_name = tokens[4]
        if not index_exists(db, table_name, index_name):
            db.execute(text(statement))

    db.commit()
