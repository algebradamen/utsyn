import getDb from './db';

export async function sendSms(phone: string, message: string) {
    if (!phone || !message) return false;
    
    try {
        const db = getDb();
        const providerRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('sms_provider') as { value: string } | undefined;
        const provider = providerRow?.value || 'webhook';

        if (provider === 'twilio') {
            const sidRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('sms_twilio_sid') as { value: string } | undefined;
            const tokenRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('sms_twilio_token') as { value: string } | undefined;
            const fromRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('sms_twilio_from') as { value: string } | undefined;

            if (sidRow?.value && tokenRow?.value && fromRow?.value) {
                const url = `https://api.twilio.com/2010-04-01/Accounts/${sidRow.value}/Messages.json`;
                // Buffer.from is available in Node.js
                const auth = Buffer.from(`${sidRow.value}:${tokenRow.value}`).toString('base64');
                const formData = new URLSearchParams();
                formData.append('To', phone);
                formData.append('From', fromRow.value);
                formData.append('Body', message);

                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData.toString()
                });
                
                if (!res.ok) {
                    console.error('Twilio error:', await res.text());
                    return false;
                }
                return true;
            }
        } else if (provider === 'webhook') {
            const webhookRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('sms_webhook_url') as { value: string } | undefined;
            if (webhookRow?.value) {
                const res = await fetch(webhookRow.value, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, message })
                });
                if (!res.ok) {
                   console.error('Webhook error:', await res.text());
                   return false; 
                }
                return true;
            }
        }
    } catch (err) {
        console.error('SMS send error:', err);
    }
    return false;
}
