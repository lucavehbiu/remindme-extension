import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, content, note, url } = req.body;

    if (!email || !content) {
      return res.status(400).json({ error: 'Email and content are required' });
    }

    const { data, error } = await resend.emails.send({
      from: 'Remind Me <onboarding@resend.dev>',
      to: email,
      subject: 'Your Reminder is Here!',
      html: `
        <h3 style="color: #1a202c;">Here's your reminder!</h3>
        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 16px; color: #1a202c;">${content}</p>
          ${note ? `<p style="font-size: 14px; color: #4a5568; margin-top: 10px;">${note}</p>` : ''}
          ${url ? `<p style="margin-top: 15px;"><a href="${url}" style="color: #4f46e5;">View Original Page</a></p>` : ''}
        </div>
        <p style="color: #718096; font-size: 12px;">Sent from your Remind Me Chrome Extension</p>
      `
    });

    if (error) {
      return res.status(400).json({ error });
    }

    return res.status(200).json({ message: 'Email sent successfully', data });
  } catch (error) {
    return res.status(500).json({ error: 'Error sending email' });
  }
}