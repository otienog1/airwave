import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user) or 'noreply@airwave.ke'

    logging.info(f"[email] host={smtp_host!r} port={smtp_port} user={smtp_user!r} from={smtp_from!r}")

    if not smtp_host or not smtp_user:
        logging.warning(
            f"[password-reset] SMTP not configured — reset link for {to_email}:\n  {reset_url}"
        )
        return True  # surface success so the UX flow still works in dev

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Reset your AirWave password'
        msg['From']    = f'AirWave <{smtp_from}>'
        msg['To']      = to_email

        text_body = (
            f"Hi,\n\n"
            f"We received a request to reset your AirWave password.\n\n"
            f"Click the link below (expires in 1 hour):\n{reset_url}\n\n"
            f"If you didn't request this, you can safely ignore this email."
        )
        html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f9;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.07);overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
              AirWave
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;color:#111218;font-size:18px;font-weight:600;">
              Reset your password
            </h2>
            <p style="margin:0 0 24px;color:#5c6080;font-size:14px;line-height:1.6;">
              We received a request to reset the password for your account.
              Click the button below — the link is valid for <strong>1 hour</strong>.
            </p>
            <a href="{reset_url}"
               style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                      color:#ffffff;padding:13px 28px;border-radius:10px;text-decoration:none;
                      font-size:14px;font-weight:600;">
              Reset Password
            </a>
            <p style="margin:28px 0 0;color:#9499b5;font-size:12px;line-height:1.5;">
              If you didn't request a password reset, you can safely ignore this email.
              Your password won't change.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;color:#c0c4d6;font-size:11px;">
              AirWave &mdash; Kenya&apos;s Best Radio
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_from, to_email, msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.ehlo()
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_from, to_email, msg.as_string())

        return True

    except Exception as e:
        logging.error(f"Failed to send reset email to {to_email}: {type(e).__name__}: {e}")
        return False
