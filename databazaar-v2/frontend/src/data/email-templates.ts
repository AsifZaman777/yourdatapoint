export const EMAIL_TEMPLATES = [
  {
    name: 'General Business Offer',
    subject: 'Special marketing offer from [COMPANY_NAME]!',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: sans-serif; padding: 20px; background: [BG_COLOR]; margin: 0;">
  <div style="background: [CARD_BG]; padding: 40px 30px; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid [BORDER_COLOR]; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 25px;">
      <h3 style="color: [PRIMARY_COLOR]; font-size: 14px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px 0;">[COMPANY_NAME]</h3>
      <h1 style="color: [PRIMARY_COLOR]; font-size: 28px; font-weight: 800; margin: 0 0 10px 0;">[OFFER_HEADING]</h1>
      <p style="font-size: 15px; color: [TEXT_COLOR]; opacity: 0.8; margin: 0 0 20px 0;">An exclusive invitation for {name}</p>
    </div>
    
    <div style="font-size: 15px; color: [TEXT_COLOR]; line-height: 1.6; margin-bottom: 25px;">
      <p>Hello {name},</p>
      <p>[OFFER_DESCRIPTION]</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; border: 2px dashed [PRIMARY_COLOR]; border-radius: 8px; padding: 12px 28px; font-size: 18px; font-weight: 800; letter-spacing: 2px; color: [PRIMARY_COLOR]; background-color: [BG_COLOR]; margin-bottom: 20px;">
        Use Code: [OFFER_CODE]
      </div>
      <br>
      <a href="[CTA_LINK]" style="background-color: [PRIMARY_COLOR]; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        [CTA_TEXT]
      </a>
    </div>

    <div style="background-color: [BG_COLOR]; padding: 20px; text-align: center; font-size: 11px; color: [TEXT_COLOR]; opacity: 0.7; border-top: 1px solid [BORDER_COLOR]; border-radius: 8px;">
      <p style="margin: 0 0 5px 0;">This email was custom crafted by [COMPANY_NAME] for partners at {name}.</p>
      <p style="margin: 0;">If you prefer not to receive these offers, you can <a href="#" style="color: [PRIMARY_COLOR];">unsubscribe</a>.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Software / SaaS Demo',
    subject: 'Exclusive Demo from [COMPANY_NAME]: Grow Your Business in 2026',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: [BG_COLOR]; color: [TEXT_COLOR]; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: [CARD_BG]; border-radius: 12px; overflow: hidden; border: 1px solid [BORDER_COLOR]; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, [PRIMARY_COLOR], [SECONDARY_COLOR]); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">[COMPANY_NAME]</h1>
    </div>
    <div style="padding: 30px; line-height: 1.6;">
      <h2 style="color: [SECONDARY_COLOR]; margin-top: 0; font-size: 20px;">[OFFER_HEADING]</h2>
      <p style="font-size: 15px; color: [TEXT_COLOR];">Hello {name},</p>
      <p style="font-size: 15px; color: [TEXT_COLOR];">[OFFER_DESCRIPTION]</p>
      <div style="background-color: [BG_COLOR]; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid [BORDER_COLOR]; text-align: center;">
        <span style="font-size: 13px; color: [TEXT_COLOR]; opacity: 0.7;">PROMO CODE ACTIVE:</span>
        <div style="font-size: 20px; font-weight: 800; color: [PRIMARY_COLOR]; margin: 5px 0 0 0;">[OFFER_CODE]</div>
      </div>
      <p style="text-align: center; margin: 30px 0 15px 0;">
        <a href="[CTA_LINK]" style="background: linear-gradient(135deg, [PRIMARY_COLOR], [SECONDARY_COLOR]); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">[CTA_TEXT]</a>
      </p>
    </div>
    <div style="background-color: [BG_COLOR]; padding: 20px; text-align: center; font-size: 12px; color: [TEXT_COLOR]; border-top: 1px solid [BORDER_COLOR];">
      <p style="margin: 0 0 5px 0;">You received this email because you are a verified subscriber of {name}.</p>
      <p style="margin: 0;">&copy; 2026 [COMPANY_NAME] Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Coaching Admission / Course Promo',
    subject: 'Boost Your Grades: 15% Discount on Coaching Enrollment!',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: [BG_COLOR]; color: [TEXT_COLOR]; margin: 0; padding: 30px 15px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: [CARD_BG]; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid [BORDER_COLOR];">
    <div style="background-color: [PRIMARY_COLOR]; padding: 25px; text-align: center;">
      <span style="color: #ffffff; font-weight: bold; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">[COMPANY_NAME]</span>
      <h1 style="color: #ffffff; margin: 5px 0 0 0; font-size: 26px;">[OFFER_HEADING]</h1>
    </div>
    <div style="padding: 30px; line-height: 1.5;">
      <h2 style="color: [TEXT_COLOR]; margin-top: 0; font-size: 20px;">Dear Student/Parent at {name},</h2>
      <p style="color: [TEXT_COLOR];">[OFFER_DESCRIPTION]</p>
      <div style="margin: 25px 0; border-left: 4px solid [PRIMARY_COLOR]; padding-left: 20px; background-color: [BG_COLOR]; padding-top: 10px; padding-bottom: 10px; border-top: 1px solid [BORDER_COLOR]; border-bottom: 1px solid [BORDER_COLOR]; border-right: 1px solid [BORDER_COLOR]; text-align: center;">
        <span style="font-size: 13px; color: [TEXT_COLOR]; opacity: 0.7;">APPLY ADMISSION COUPON CODE:</span>
        <div style="font-size: 20px; font-weight: 800; color: [PRIMARY_COLOR]; margin-top: 4px;">[OFFER_CODE]</div>
      </div>
      <p style="text-align: center; margin: 30px 0 0 0;">
        <a href="[CTA_LINK]" style="background-color: [PRIMARY_COLOR]; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">[CTA_TEXT]</a>
      </p>
    </div>
    <div style="background-color: [BG_COLOR]; padding: 20px; text-align: center; font-size: 12px; color: [TEXT_COLOR]; border-top: 1px solid [BORDER_COLOR];">
      <p style="margin: 0;">For inquiries, visit our local center or call [COMPANY_NAME] directly.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'B2B Consultancy / Business Proposal',
    subject: 'Optimized Solutions from [COMPANY_NAME] - Request a Proposal',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Georgia, serif; background-color: [BG_COLOR]; color: [TEXT_COLOR]; margin: 0; padding: 40px 10px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: [CARD_BG]; border: 1px solid [BORDER_COLOR]; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid [BORDER_COLOR]; padding-bottom: 20px;">
      <h2 style="font-size: 22px; font-weight: normal; letter-spacing: 1px; color: [TEXT_COLOR]; margin: 0;">[COMPANY_NAME]</h2>
    </div>
    <div style="font-size: 15px; line-height: 1.7; color: [TEXT_COLOR];">
      <h3 style="font-size: 18px; color: [PRIMARY_COLOR]; margin-top: 0;">[OFFER_HEADING]</h3>
      <p>Dear Partners at {name},</p>
      <p>[OFFER_DESCRIPTION]</p>
      <p>Use code <strong>[OFFER_CODE]</strong> to schedule a prioritized consultation call.</p>
      <p style="text-align: center; margin: 25px 0;">
        <a href="[CTA_LINK]" style="background-color: [PRIMARY_COLOR]; color: white; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">[CTA_TEXT]</a>
      </p>
    </div>
    <div style="margin-top: 40px; border-top: 1px solid [BORDER_COLOR]; padding-top: 20px; font-size: 11px; color: [TEXT_COLOR]; text-align: center;">
      <p style="margin: 0;">[COMPANY_NAME] Consulting · NY Office</p>
    </div>
  </div>
</body>
</html>`
  }
];

export const EMAIL_PALETTES = [
  {
    name: 'Royal Indigo',
    primary: '#4f46e5',
    secondary: '#6366f1',
    bg: '#f3f4f6',
    text: '#1f2937',
    cardBg: '#ffffff',
    borderColor: '#e5e7eb'
  },
  {
    name: 'Cyber Pink / Purple',
    primary: '#ff0055',
    secondary: '#bd00ff',
    bg: '#0f0814',
    text: '#f8fafc',
    cardBg: '#160f22',
    borderColor: '#334155'
  },
  {
    name: 'Forest Mint',
    primary: '#059669',
    secondary: '#10b981',
    bg: '#f0fdf4',
    text: '#064e3b',
    cardBg: '#ffffff',
    borderColor: '#d1fae5'
  },
  {
    name: 'Ocean Cyan',
    primary: '#0891b2',
    secondary: '#06b6d4',
    bg: '#ecfeff',
    text: '#164e63',
    cardBg: '#ffffff',
    borderColor: '#cffafe'
  },
  {
    name: 'Warm Amber',
    primary: '#ea580c',
    secondary: '#f97316',
    bg: '#fff7ed',
    text: '#431407',
    cardBg: '#ffffff',
    borderColor: '#ffedd5'
  },
  {
    name: 'Charcoal Minimalist',
    primary: '#1f2937',
    secondary: '#4b5563',
    bg: '#f9fafb',
    text: '#111827',
    cardBg: '#ffffff',
    borderColor: '#e5e7eb'
  }
];