import html
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import requests

from utils.env_loader import load_project_env


load_project_env()

EMAIL_SERVICE_VERSION = "email_service_resend_v6_ok"
RESEND_ENDPOINT = "https://api.resend.com/emails"
DEFAULT_EMAIL_FROM = "TransBovino <onboarding@resend.dev>"


def _env_value(name: str) -> str:
    return (os.getenv(name) or "").strip()


def get_email_provider_status() -> dict[str, Any]:
    resend_api_key = _env_value("RESEND_API_KEY")
    email_from = _env_value("EMAIL_FROM") or _env_value("SMTP_FROM") or DEFAULT_EMAIL_FROM

    return {
        "codigo": EMAIL_SERVICE_VERSION,
        "provider": "resend" if bool(resend_api_key) else "smtp",
        "resend_configurado": bool(resend_api_key),
        "email_from_configurado": bool(email_from),
        "email_from": email_from,
        "smtp_host_configurado": bool(_env_value("SMTP_HOST")),
        "smtp_user_configurado": bool(_env_value("SMTP_USER")),
        "reset_base_url": _env_value("RESET_BASE_URL") or _env_value("FRONTEND_URL"),
    }


def _build_email_html(reset_link: str, user_name: str | None = None) -> str:
    nombre = html.escape(user_name or "usuario")
    safe_link = html.escape(reset_link, quote=True)

    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937; background:#f8fafc; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background:#ffffff;">
          <h2 style="color: #29650B; margin-top: 0;">Recuperación de contraseña</h2>
          <p>Hola {nombre},</p>
          <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta en <strong>TransBovino</strong>.</p>
          <p>Para continuar, haz clic en el siguiente botón:</p>
          <p style="margin: 24px 0;">
            <a href="{safe_link}" style="background: #29650B; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
              Restablecer contraseña
            </a>
          </p>
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color:#334155;">{safe_link}</p>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      </body>
    </html>
    """


def _send_with_resend(to_email: str, subject: str, html_body: str) -> None:
    api_key = _env_value("RESEND_API_KEY")
    email_from = _env_value("EMAIL_FROM") or _env_value("SMTP_FROM") or DEFAULT_EMAIL_FROM

    if not api_key:
        raise RuntimeError("Falta configurar RESEND_API_KEY en las variables de entorno de Render.")

    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "TransBovino/1.0 (Render; FastAPI; Python requests)",
    }

    try:
        response = requests.post(RESEND_ENDPOINT, json=payload, headers=headers, timeout=20)
    except requests.RequestException as exc:
        raise RuntimeError(f"No se pudo conectar con Resend: {exc}") from exc

    if response.status_code >= 400:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text
        raise RuntimeError(f"Error de Resend {response.status_code}: {detail}")


def _send_with_smtp(to_email: str, subject: str, html_body: str) -> None:
    smtp_host = _env_value("SMTP_HOST")
    smtp_port = int(_env_value("SMTP_PORT") or "587")
    smtp_user = _env_value("SMTP_USER")
    smtp_password = _env_value("SMTP_PASSWORD")
    smtp_from = _env_value("SMTP_FROM") or _env_value("EMAIL_FROM") or smtp_user
    smtp_use_tls = (_env_value("SMTP_USE_TLS") or "true").lower() in ("1", "true", "yes")

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        raise RuntimeError(
            "Falta configurar el correo. Para Render usa RESEND_API_KEY y EMAIL_FROM. "
            "Si quieres SMTP, define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM."
        )

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = smtp_from
    message["To"] = to_email
    message.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        server.ehlo()
        if smtp_use_tls:
            server.starttls()
            server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, [to_email], message.as_string())


def send_reset_email(to_email: str, reset_link: str, user_name: str | None = None) -> None:
    subject = "Recuperación de contraseña - TransBovino"
    html_body = _build_email_html(reset_link, user_name)

    status = get_email_provider_status()
    print(
        f"[EMAIL] proveedor={status['provider']} codigo={EMAIL_SERVICE_VERSION} "
        f"resend={status['resend_configurado']} from={status['email_from']}",
        flush=True,
    )

    if status["resend_configurado"]:
        _send_with_resend(to_email, subject, html_body)
        return

    _send_with_smtp(to_email, subject, html_body)
