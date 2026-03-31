import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


EMAIL_SENDER_DEFAULT = "azertyqwerton@gmail.com"
APP_PASSWORD_DEFAULT = "itmx lhvq uvyx xglv"


def send_email_to_user(
    temp_password: str,
    email_receiver: str,
    email_sender: str = EMAIL_SENDER_DEFAULT,
    app_password: str = APP_PASSWORD_DEFAULT,
) -> bool:
    """Envoie un email de bienvenue avec le mot de passe temporaire."""
    subject = "Mot de passe de création — Prédistock"
    body = f"""
    <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333; background: #fff; padding: 30px;
        border-left: 4px solid #2a7ae2; border-radius: 8px;
        max-width: 600px; margin: 0 auto;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    ">
        <h2 style="color:#2a7ae2;margin-top:0;">Bonjour,</h2>
        <p>Votre compte <strong>Prédistock</strong> a été créé avec succès.</p>
        <p>Utilisez votre adresse email pour vous connecter.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <p>
            <strong>Mot de passe temporaire :</strong>
            <span style="
                display:inline-block;padding:8px 12px;
                background:#f0f8ff;color:#2a7ae2;
                border:1px solid #2a7ae2;border-radius:6px;
                font-family:monospace;font-size:18px;margin-left:8px;
            ">{temp_password}</span>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <p style="color:#555;">
            Changez ce mot de passe dès votre première connexion.
        </p>
        <p style="margin-top:24px;font-size:14px;color:#777;">
            Cordialement,<br>
            <strong style="color:#2a7ae2;">L'équipe Prédistock</strong>
        </p>
    </div>
    """

    msg = MIMEMultipart()
    msg["From"] = email_sender
    msg["To"] = email_receiver
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(email_sender, app_password)
            server.sendmail(email_sender, email_receiver, msg.as_string())
        return True
    except Exception as e:
        raise RuntimeError(f"Échec de l'envoi à {email_receiver} : {e}") from e