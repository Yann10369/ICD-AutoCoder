"""邮件通知服务 - 简单配置"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
import logging

from app.core.config import settings
from app.core.logger import logger

logger = logging.getLogger(__name__)


class EmailService:
    """简单SMTP邮件发送服务"""

    def __init__(self):
        self.enabled = settings.EMAIL_ENABLED
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_addr = settings.EMAIL_FROM
        self.to_admin = settings.EMAIL_TO_ADMIN

    def _send_email(self, to_addr: str, subject: str, body: str, html: bool = False) -> bool:
        """实际发送邮件"""
        if not self.enabled:
            logger.debug(f"邮件未启用，跳过发送: {subject} -> {to_addr}")
            return True

        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_addr
            msg['To'] = to_addr
            msg['Subject'] = subject

            if html:
                msg.attach(MIMEText(body, 'html', 'utf-8'))
            else:
                msg.attach(MIMEText(body, 'plain', 'utf-8'))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_addr, [to_addr], msg.as_string())

            logger.info(f"邮件发送成功: {subject} -> {to_addr}")
            return True

        except Exception as e:
            logger.error(f"邮件发送失败: {e}")
            return False

    def notify_case_assigned(self, coder_email: str, coder_name: str, case_id: str, patient_name: str) -> bool:
        """新病例分配通知"""
        subject = f"【ICD编码】新病例分配 - {case_id}"
        body = f"""
{coder_name}，您好：

您有一个新的编码任务：

病例ID：{case_id}
患者姓名：{patient_name}

请登录ICD自动编码系统进行处理。

此邮件由系统自动发送，请勿回复。
"""
        return self._send_email(coder_email, subject, body)

    def notify_case_rejected(self, coder_email: str, coder_name: str, case_id: str, reason: str) -> bool:
        """病例被打回通知"""
        subject = f"【ICD编码】病例被退回 - {case_id}"
        body = f"""
{coder_name}，您好：

您的编码病例已被质控退回，需要修改：

病例ID：{case_id}
退回原因：{reason}

请登录ICD自动编码系统查看详情并进行修改。

此邮件由系统自动发送，请勿回复。
"""
        return self._send_email(coder_email, subject, body)

    def notify_case_approved(self, coder_email: str, coder_name: str, case_id: str) -> bool:
        """病例审核通过通知"""
        subject = f"【ICD编码】编码通过 - {case_id}"
        body = f"""
{coder_name}，您好：

您提交的编码病例已审核通过：

病例ID：{case_id}

感谢您的工作！

此邮件由系统自动发送，请勿回复。
"""
        return self._send_email(coder_email, subject, body)

    def notify_qa_pending(self, qa_email: str, qa_name: str, pending_count: int) -> bool:
        """待质控病例提醒"""
        subject = f"【ICD编码】待质控病例提醒 - {pending_count}例"
        body = f"""
{qa_name}，您好：

当前有 {pending_count} 例病例待质控审核。

请登录ICD自动编码系统进行处理。

此邮件由系统自动发送，请勿回复。
"""
        return self._send_email(qa_email, subject, body)

    def notify_security_alert(self, admin_email: str, alert_type: str, detail: str) -> bool:
        """安全告警通知"""
        subject = f"【安全告警】{alert_type}"
        body = f"""
管理员，您好：

系统检测到安全相关事件：

告警类型：{alert_type}
详情：{detail}
时间：当前时间

请立即登录系统检查。

此邮件由系统自动发送，请勿回复。
"""
        return self._send_email(admin_email or self.to_admin, subject, body)


# 全局实例
email_service = EmailService()