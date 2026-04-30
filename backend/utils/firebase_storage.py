from __future__ import annotations

import json
import mimetypes
import os
import tempfile
from datetime import timedelta
from pathlib import Path
from typing import Optional

try:
    from google.cloud import storage  # type: ignore
except Exception:
    storage = None

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CREDENTIALS_DIR = BASE_DIR / "credentials"


def _resolve_credentials_path() -> Optional[Path]:
    # Opción para Render: JSON completo guardado como variable ambiental
    credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "").strip()

    if credentials_json:
        try:
            payload = json.loads(credentials_json)

            temp_path = Path(tempfile.gettempdir()) / "firebase-service-account.json"
            temp_path.write_text(json.dumps(payload), encoding="utf-8")

            return temp_path
        except Exception as exc:
            raise RuntimeError(
                "La variable FIREBASE_CREDENTIALS_JSON no contiene un JSON válido"
            ) from exc

    # Opción local: ruta a archivo JSON
    candidates = [
        os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip(),
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip(),
    ]

    for candidate in candidates:
        if not candidate:
            continue
        path = Path(candidate)
        if not path.is_absolute():
            path = (BASE_DIR / candidate).resolve()
        if path.exists():
            return path

    # Opción local: buscar dentro de backend/credentials/
    if DEFAULT_CREDENTIALS_DIR.exists():
        json_files = sorted(DEFAULT_CREDENTIALS_DIR.glob("*.json"))
        if json_files:
            return json_files[0]

    return None


def _read_project_id(credentials_path: Path) -> str:
    try:
        payload = json.loads(credentials_path.read_text(encoding="utf-8"))
        return str(payload.get("project_id") or "").strip()
    except Exception:
        return ""


def _resolve_bucket_name(credentials_path: Optional[Path]) -> str:
    explicit = os.getenv("FIREBASE_STORAGE_BUCKET", "").strip()
    if explicit:
        return explicit

    if credentials_path:
        project_id = _read_project_id(credentials_path)
        if project_id:
            return f"{project_id}.firebasestorage.app"

    return ""


def is_firebase_storage_configured() -> bool:
    credentials_path = _resolve_credentials_path()
    bucket_name = _resolve_bucket_name(credentials_path)
    return bool(storage and credentials_path and bucket_name)


def _get_client_and_bucket():
    if storage is None:
        raise RuntimeError(
            "Falta instalar google-cloud-storage. Ejecuta: pip install google-cloud-storage"
        )

    credentials_path = _resolve_credentials_path()
    if not credentials_path:
        raise RuntimeError(
            "No se encontró la credencial de Firebase. "
            "Configura FIREBASE_CREDENTIALS_JSON en Render o guarda el JSON en backend/credentials/."
        )

    bucket_name = _resolve_bucket_name(credentials_path)
    if not bucket_name:
        raise RuntimeError("No se pudo resolver el bucket de Firebase Storage")

    client = storage.Client.from_service_account_json(str(credentials_path))
    bucket = client.bucket(bucket_name)
    return client, bucket, bucket_name


def upload_private_file(object_path: str, content: bytes, original_name: str) -> str:
    _, bucket, bucket_name = _get_client_and_bucket()

    blob = bucket.blob(object_path)
    content_type = mimetypes.guess_type(original_name)[0] or "application/octet-stream"
    blob.upload_from_string(content, content_type=content_type)

    return f"gs://{bucket_name}/{object_path}"


def generate_private_file_url(
    storage_uri: str,
    expiration_minutes: int = 30,
    *,
    download: bool = False,
    download_name: str | None = None,
) -> str:
    if not storage_uri.startswith("gs://"):
        return storage_uri

    _, bucket, bucket_name = _get_client_and_bucket()
    prefix = f"gs://{bucket_name}/"

    if not storage_uri.startswith(prefix):
        raise RuntimeError("La ruta del archivo no pertenece al bucket configurado")

    object_path = storage_uri.replace(prefix, "", 1)
    blob = bucket.blob(object_path)

    response_disposition = None
    if download:
        safe_name = (download_name or Path(object_path).name).replace('"', "")
        response_disposition = f'attachment; filename="{safe_name}"'

    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=expiration_minutes),
        method="GET",
        response_disposition=response_disposition,
    )


def delete_private_file(storage_uri: str) -> bool:
    if not storage_uri:
        return False

    if storage_uri.startswith("gs://"):
        _, bucket, bucket_name = _get_client_and_bucket()
        prefix = f"gs://{bucket_name}/"
        if not storage_uri.startswith(prefix):
            raise RuntimeError("La ruta del archivo no pertenece al bucket configurado")
        object_path = storage_uri.replace(prefix, "", 1)
        blob = bucket.blob(object_path)
        blob.delete()
        return True

    ruta = Path(storage_uri)
    if ruta.exists() and ruta.is_file():
        ruta.unlink(missing_ok=True)
        return True
    return False


def build_solicitud_document_path(
    id_usuario: int,
    id_solicitud: int,
    doc_type: str,
    filename: str,
) -> str:
    return f"solicitudes/{id_usuario}/{id_solicitud}/{doc_type}/{filename}"


def build_vehicle_document_path(
    id_usuario: int,
    id_vehiculo: int,
    filename: str,
) -> str:
    return f"vehiculos/{id_usuario}/{id_vehiculo}/{filename}"


def build_bovino_document_path(
    id_usuario: int,
    id_bovino: int,
    filename: str,
) -> str:
    return f"bovinos/{id_usuario}/{id_bovino}/{filename}"