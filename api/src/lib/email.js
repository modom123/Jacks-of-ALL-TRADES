const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@jacksofalltrading.org';
const FROM_EMAIL = 'notifications@jacksofalltradesdetroit.org';

async function sendEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Jacks of All Trades <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Email exception:', err);
    return { success: false, error: err };
  }
}

async function sendApplicationAlert(data) {
  const html = `
    <h2>New Apprenticeship Application</h2>
    <p><strong>Name:</strong> ${data.full_name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
    <p><strong>Trade Interest:</strong> ${data.trade_interest || 'Not specified'}</p>
    <p><strong>Background:</strong></p>
    <blockquote>${data.background || 'Not provided'}</blockquote>
    <p><a href="${process.env.FRONTEND_URL}/admin/applications">Review in Admin Dashboard</a></p>
  `;
  return sendEmail(ADMIN_EMAIL, `New Application: ${data.full_name}`, html);
}

async function sendContactAlert(data) {
  const html = `
    <h2>New Contact Message</h2>
    <p><strong>From:</strong> ${data.full_name} (${data.email})</p>
    <p><strong>Type:</strong> ${data.type}</p>
    <p><strong>Subject:</strong> ${data.subject || 'No subject'}</p>
    <p><strong>Message:</strong></p>
    <blockquote>${data.message}</blockquote>
    <p><a href="${process.env.FRONTEND_URL}/admin/contacts">View in Admin Dashboard</a></p>
  `;
  return sendEmail(ADMIN_EMAIL, `New Contact: ${data.subject || data.full_name}`, html);
}

async function sendDonationReceipt(data) {
  const amount = (data.amount_cents / 100).toFixed(2);
  const html = `
    <h2>Thank You for Your Donation!</h2>
    <p>Dear ${data.donor_name || 'Friend'},</p>
    <p>Thank you for your generous donation of <strong>$${amount}</strong> to Jacks of All Trades.</p>
    <p>Your contribution directly supports Detroit youth apprenticeship programs and helps build futures in the trades.</p>
    <p><strong>Donation Details:</strong></p>
    <ul>
      <li>Amount: $${amount}</li>
      <li>Type: ${data.type || 'Financial'}</li>
      <li>Date: ${new Date().toLocaleDateString()}</li>
    </ul>
    <p>This serves as your donation receipt. Please keep it for your records.</p>
    <p>With gratitude,<br/>The Jacks of All Trades Team</p>
  `;
  if (data.donor_email) {
    await sendEmail(data.donor_email, 'Thank You for Your Donation - Jacks of All Trades', html);
  }
  const adminHtml = `
    <h2>New Donation Received</h2>
    <p><strong>Donor:</strong> ${data.donor_name || 'Anonymous'}</p>
    <p><strong>Email:</strong> ${data.donor_email || 'Not provided'}</p>
    <p><strong>Amount:</strong> $${amount}</p>
    <p><strong>Type:</strong> ${data.type || 'Financial'}</p>
  `;
  return sendEmail(ADMIN_EMAIL, `Donation Received: $${amount}`, adminHtml);
}

async function sendVolunteerAlert(data) {
  const html = `
    <h2>New Volunteer Sign-Up</h2>
    <p><strong>Name:</strong> ${data.full_name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Trade Skill:</strong> ${data.trade_skill || 'Not specified'}</p>
    <p><strong>Role Interest:</strong> ${data.role || 'Not specified'}</p>
    <p><a href="${process.env.FRONTEND_URL}/admin/volunteers">View in Admin Dashboard</a></p>
  `;
  return sendEmail(ADMIN_EMAIL, `New Volunteer: ${data.full_name}`, html);
}

module.exports = { sendEmail, sendApplicationAlert, sendContactAlert, sendDonationReceipt, sendVolunteerAlert };
