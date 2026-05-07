const axios = require('axios');
// Mirai Cloud IT Services - Premium Email Utility v2.0

/**
 * Sends a high-deliverability Premium branded OTP email via Brevo REST API (v3)
 */
const sendOTP = async (email, name, otp, schoolName = 'Institutional Portal') => {
  try {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'support@miraiclouditservices.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Mirai Cloud IT Services';

    const url = 'https://api.brevo.com/v3/smtp/email';

    // Premium Template optimized for high deliverability (No external fonts/complex CSS)
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f7fb;padding:20px 0;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#0052CC 0%,#003d99 100%);padding:50px 40px;text-align:center;color:#ffffff;">
                    <p style="margin:0;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;opacity:0.8;">Mirai Cloud IT Services</p>
                    <h1 style="margin:10px 0 0 0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">${schoolName}</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:50px 40px;text-align:center;">
                    <h2 style="margin:0 0 15px 0;font-size:22px;color:#0f172a;font-weight:700;">Account Verification</h2>
                    <p style="margin:0 0 35px 0;font-size:16px;color:#64748b;line-height:1.6;">Hello <strong>${name}</strong>,<br>Please use the following security code to complete your registration on our institutional portal.</p>
                    
                    <!-- OTP Box -->
                    <table align="center" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;border-radius:14px;border:1px solid #e2e8f0;">
                      <tr>
                        <td style="padding:25px 40px;font-size:42px;font-weight:800;color:#0052CC;letter-spacing:10px;font-family:monospace;">
                          ${otp}
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin:25px 0 0 0;font-size:13px;font-weight:bold;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Expires in 10 minutes</p>
                    
                    <!-- Alert -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:40px;background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
                      <tr>
                        <td style="padding:15px 20px;text-align:left;font-size:14px;color:#92400e;line-height:1.4;">
                          <strong>Security Tip:</strong> Never share this code. If you didn't request this, please ignore this email.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:30px 40px;text-align:center;border-top:1px solid #f1f5f9;background-color:#fafafa;">
                    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                      © 2026 <strong>Mirai Cloud IT Services</strong>. All rights reserved.<br>
                      Enterprise School Management Ecosystem.<br>
                      <a href="https://wa.me/919100218218" style="color:#0052CC;text-decoration:none;font-weight:600;">Support: +91 91002 18218</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const response = await axios.post(url, {
      sender: { name: senderName, email: senderEmail },
      to: [{ email, name }],
      subject: `🔐 ${otp} is your verification code for ${schoolName}`,
      htmlContent: htmlTemplate
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`✅ Premium Branded Email Sent for ${schoolName}`);
    return response.data;

  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('❌ BREVO API ERROR:', errorMsg);

    if (process.env.NODE_ENV === 'development') {
      console.log('\n-----------------------------------------');
      console.log('🚀 [DEV MODE] OTP CONSOLE DELIVERY (API Failed)');
      console.log(`CODE: ${otp}`);
      console.log('-----------------------------------------\n');
      return { success: true, message: 'Logged to console' };
    }

    throw new Error(errorMsg || 'Failed to send OTP email');
  }
};

module.exports = { sendOTP };
