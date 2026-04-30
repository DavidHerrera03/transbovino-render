import html
import json
import os
import smtplib
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from utils.env_loader import load_project_env


load_project_env()

EMAIL_SERVICE_VERSION = "email_service_resend_v5_syntax_ok"
RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_EMAIL_FROM = "TransBovino <onboarding@resend.dev>"


def get_email_provider_status() -> dict:
    """Devuelve informacion segura para diagnosticar la configuracion de correo."""
    resend_api_key = os.getenv("RESEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM") or DEFAULT_EMAIL_FROM
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM")

    return {
        "codigo": EMAIL_SERVICE_VERSION,
        "provider": "resend" if bool(resend_api_key) else "smtp",
        "resend_configurado": bool(resend_api_key),
        "email_from_configurado": bool(os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM")),
        "email_from": email_from,
        "smtp_configurado": bool(smtp_host and smtp_user and smtp_password and smtp_from),
        "smtp_host_configurado": bool(smtp_host),
        "smtp_user_configurado": bool(smtp_user),
        "smtp_password_configurado": bool(smtp_password),
        "smtp_from_configurado": bool(smtp_from),
    }


def _crear_html(reset_link: str, user_name: str | None = None) -> str:
    nombre = html.escape(user_name or "usuario")
    enlace = html.escape(reset_link, quote=True)

    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937; background: #f9fafb; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #29650B; margin-top: 0;">Recuperacion de contrasena</h2>
          <p>Hola {nombre},</p>
          <p>Recibimos una solicitud para cambiar la contrasena de tu cuenta en <strong>TransBovino</strong>.</p>
          <p>Para continuar, haz clic en el siguiente boton:</p>
          <p style="margin: 24px 0;">
            <a href="{enlace}" style="background: #29650B; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
              Restablecer contrasena
            </a>
          </p>
          <p>Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #374151;">{enlace}</p>
          <p>Este enlace expirara en 1 hora.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      </body>
    </html>
    """


def _enviar_por_resend(to_email: str, subject: str, html_body: str) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("Falta configurar RESEND_API_KEY en las variables de entorno de Render.")

    email_from = os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM") or DEFAULT_EMAIL_FROM

    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }

    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        RESEND_API_URL,
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
            if response.status < 200 or response.status >= 300:
                body = response.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"Error de Resend {response.status}: {body}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Error de Resend {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"No se pudo conectar con Resend: {exc.reason}") from exc


def _enviar_por_smtp(to_email: str, subject: str, html_body: str) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "")
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        raise RuntimeError(
            "Falta configurar el correo. Si usas Render gratis, define RESEND_API_KEY y EMAIL_FROM. "
            "Si usas SMTP, define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM."
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
    subject = "Recuperacion de contrasena - TransBovino"
    html_body = _crear_html(reset_link, user_name)
    status = get_email_provider_status()

    print(
        f"[CORREO ELECTRONICO] proveedor={status['provider']} "
        f"codigo={EMAIL_SERVICE_VERSION} resend={status['resend_configurado']}",
        flush=True,
    )

    if os.getenv("RESEND_API_KEY"):
        _enviar_por_resend(to_email, subject, html_body)
    else:
        _enviar_por_smtp(to_email, subject, html_body)
