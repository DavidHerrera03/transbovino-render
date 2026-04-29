import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from utils.env_loader import load_project_env


load_project_env()


def send_reset_email(to_email: str, reset_link: str, user_name: str | None = None):
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    smtp_from = os.getenv('SMTP_FROM', smtp_user or '')
    smtp_use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() in ('1', 'true', 'yes')

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        raise RuntimeError(
            'Falta configurar el correo SMTP. Define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM.'
        )

    nombre = user_name or 'usuario'
    subject = 'Recuperacion de contrasena - TransBovino'
    html = f'''
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937;">
        <div style="max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #29650B; margin-top: 0;">Recuperacion de contrasena</h2>
          <p>Hola {nombre},</p>
          <p>Recibimos una solicitud para cambiar la contrasena de tu cuenta en <strong>TransBovino</strong>.</p>
          <p>Para continuar, haz clic en el siguiente boton:</p>
          <p style="margin: 24px 0;">
            <a href="{reset_link}" style="background: #29650B; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
              Restablecer contrasena
            </a>
          </p>
          <p>Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all;">{reset_link}</p>
          <p>Este enlace expirara en 1 hora.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      </body>
    </html>
    '''

    message = MIMEMultipart('alternative')
    message['Subject'] = subject
    message['From'] = smtp_from
    message['To'] = to_email
    message.attach(MIMEText(html, 'html', 'utf-8'))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        if smtp_use_tls:
            server.starttls()
            server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, [to_email], message.as_string())
