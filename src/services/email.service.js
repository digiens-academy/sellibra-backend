const { Resend } = require('resend');
const config = require('../config/env');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    if (!config.resendApiKey) {
      logger.warn('⚠️  RESEND_API_KEY not set - email functionality will be disabled');
      this.resend = null;
    } else {
      this.resend = new Resend(config.resendApiKey);
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User's email address
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User's first name
   */
  async sendPasswordResetEmail(email, resetToken, userName) {
    const resetUrl = `${config.frontendUrl}/reset-password/${resetToken}`;

    if (!this.resend) {
      throw new Error('Email service is not configured');
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Şifre Sıfırlama</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #6366f1;
            margin: 0;
            font-size: 28px;
        }
        h2 {
            color: #333;
            margin-top: 0;
        }
        .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #6366f1;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 24px 0;
            font-weight: 600;
        }
        .button:hover {
            background-color: #4f46e5;
        }
        .info-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .link-text {
            color: #6b7280;
            font-size: 14px;
            word-break: break-all;
            background-color: #f9fafb;
            padding: 12px;
            border-radius: 4px;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>📧 Sellibra</h1>
        </div>
        
        <h2>Merhaba ${userName},</h2>
        
        <p>Hesabınız için bir şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
        </div>
        
        <div class="info-box">
            <strong>⏰ Önemli:</strong> Bu link 1 saat süreyle geçerlidir. Süre sonunda yeni bir şifre sıfırlama talebi oluşturmanız gerekecektir.
        </div>
        
        <p>Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:</p>
        
        <div class="link-text">
            ${resetUrl}
        </div>
        
        <div class="footer">
            <p><strong>Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</strong> Şifreniz değiştirilmeyecektir.</p>
            <p>Sorularınız için bizimle iletişime geçebilirsiniz.</p>
            <p>Saygılarımızla,<br>Sellibra Ekibi</p>
        </div>
    </div>
</body>
</html>
    `;

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Sellibra <noreply@sellibra.com>',
        to: email,
        subject: 'Şifre Sıfırlama Talebi - Sellibra',
        html: htmlContent,
      });

      if (error) {
        logger.error('Resend email error:', error);
        throw new Error('Email gönderilemedi');
      }

      logger.info(`Password reset email sent to ${email}, ID: ${data.id}`);
      return data;
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Send welcome email (can be used for future enhancements)
   * @param {string} email - User's email address
   * @param {string} userName - User's name
   */
  async sendWelcomeEmail(email, userName) {
    if (!this.resend) {
      throw new Error('Email service is not configured');
    }

    // This is for future use
    logger.info(`Welcome email would be sent to ${email}`);
  }
}

module.exports = new EmailService();

