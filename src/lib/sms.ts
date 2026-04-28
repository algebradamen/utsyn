import getDb from './db';

export async function sendSms(phone: string, message: string) {
    const trimmedPhone = phone?.trim();
    if (!trimmedPhone || !message) return false;
    try {
        const sql = await getDb();
        const settingsRows = await sql`SELECT key, value FROM settings WHERE key IN ('sms_provider', 'sms_twilio_sid', 'sms_twilio_token', 'sms_twilio_from', 'sms_webhook_url')`;
        const settings: Record<string, string> = {};
        for (const row of settingsRows) {
            settings[row.key] = row.value;
        }

        const provider = settings['sms_provider'] || 'webhook';

        if (provider === 'twilio') {
            const sid = (settings['sms_twilio_sid'] || '').trim();
            const token = (settings['sms_twilio_token'] || '').trim();
            const from = (settings['sms_twilio_from'] || '').trim();

            if (sid && token && from) {
                const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
                const auth = Buffer.from(`${sid}:${token}`).toString('base64');
                const formData = new URLSearchParams();
                formData.append('To', phone.trim());
                formData.append('From', from);
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

            console.error('Twilio SMS skipped because configuration is incomplete', {
                hasSid: Boolean(sid),
                hasToken: Boolean(token),
                hasFrom: Boolean(from),
            });
        } else if (provider === 'webhook') {
            const webhookUrl = settings['sms_webhook_url']?.trim();
            if (webhookUrl) {
                const res = await fetch(webhookUrl, {
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
