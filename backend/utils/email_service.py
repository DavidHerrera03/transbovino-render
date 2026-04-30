import json
import os
import smtplib
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from typing import Optional, Tuple

from utils.env_loader import load_project_env

load_project_env()

RESEND_ENDPOINT = "https://api.resend.com/emails"
DEFAULT_EMAIL_FROM = "TransBovino <onboarding@resend.dev>"


def _env(name: str, default: str = "") -> str:
    """Lee una variable de entorno limpiando espacios y comillas accidentales."""
    value = os.getenv(name, default)
    if value is None:
        return default
    return str(value).strip().strip('"').strip("'")


def get_email_provider_status() -> dict:
    """
    Diagnostico seguro para verificar que Render esta usando este codigo.
    No devuelve claves ni contrasenas.
    """
    resend_api_key = _env("RESEND_API_KEY")
    email_from = _env("EMAIL_FROM", DEFAULT_EMAIL_FROM)
    smtp_host = _env("SMTP_HOST")
    smtp_user = _env("SMTP_USER")
    smtp_from = _env("SMTP_FROM")

    provider = "resend" if resend_api_key else "smtp"
    return {
        "provider": provider,
        "resend_configurado": bool(resend_api_key),
        "email_from_configurado": bool(email_from),
        "email_from": email_from,
        "smtp_host_configurado": bool(smtp_host),
        "smtp_user_configurado": bool(smtp_user),
        "smtp_from_configurado": bool(smtp_from),
        "codigo": "email_service_resend_v4",
    }


def _build_reset_email(reset_link: str, user_name: Optional[str] = None) -> Tuple[str, str]:
    nombre = escape(user_name or "usuario")
    link = escape(reset_link, quote=True)
    subject = "Recuperacion de contrasena - TransBovino"
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937; background:#f6f7f1; padding:24px;">
        <div style="max-width: 560px; margin: 0 auto; padding: 24px; background:white; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #29650B; margin-top: 0;">Recuperacion de contrasena</h2>
          <p>Hola {nombre},</p>
          <p>Recibimos una solicitud para cambiar la contrasena de tu cuenta en <strong>TransBovino</strong>.</p>
          <p>Para continuar, haz clic en el siguiente boton:</p>
          <p style="margin: 24px 0;">
            <a href="{link}" style="background: #29650B; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
              Restablecer contrasena
            </a>
          </p>
          <p>Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color:#374151;">{link}</p>
          <p>Este enlace expirara en 1 hora.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      </body>
    </html>
    """
    return subject, html


def _send_with_resend(to_email: str, subject: str, html: str) -> None:
    api_key = _env("RESEND_API_KEY")
    email_from = _env("EMAIL_FROM", DEFAULT_EMAIL_FROM)

    if not api_key:
        raise RuntimeError("RESEND_API_KEY no esta configurada en Render para el servicio backend.")

    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }

request = urllib.request.Request(
    "https://api.resend.com/emails",
    data=data,
    method="POST",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "TransBovino/1.0 (Render; FastAPI; Python)",
    },
)

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            if response.status not in (200, 201, 202):
                raise RuntimeError(f"Resend respondio con estado {response.status}: {body}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Error de Resend {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"No se pudo conectar con Resend: {exc.reason}") from exc


def _send_with_smtp(to_email: str, subject: str, html: str) -> None:
    smtp_host = _env("SMTP_HOST")
    smtp_port = int(_env("SMTP_PORT", "587") or "587")
    smtp_user = _env("SMTP_USER")
    smtp_password = _env("SMTP_PASSWORD")
    smtp_from = _env("SMTP_FROM", smtp_user)
    smtp_use_tls = _env("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        raise RuntimeError(
            "No se encontro RESEND_API_KEY y tampoco estan completas las variables SMTP. "
            "En Render gratis debes usar RESEND_API_KEY y EMAIL_FROM en el servicio backend."
        )

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = smtp_from
    message["To"] = to_email
    message.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        server.ehlo()
        if smtp_use_tls:
            server.starttls()
            server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, [to_email], message.as_string())


def send_reset_email(to_email: str, reset_link: str, user_name: Optional[str] = None) -> None:
    """
    Envia el correo de recuperacion.
    En Render, si RESEND_API_KEY existe, SIEMPRE usa Resend y NO pide SMTP.
    """
    subject, html = _build_reset_email(reset_link, user_name)

    provider_status = get_email_provider_status()
    print(f"[EMAIL] proveedor={provider_status['provider']} codigo={provider_status['codigo']} resend={provider_status['resend_configurado']}")

    if _env("RESEND_API_KEY"):
        _send_with_resend(to_email, subject, html)
        return

    _send_with_smtp(to_email, subject, html)
