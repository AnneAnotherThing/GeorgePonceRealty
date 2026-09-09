// Cloudflare Pages Function: POST /api/send-client-email
// Sends a George-voiced email to one gp_contacts client, from the Client
// Book. Caller must be a signed-in Supabase user listed in gp_admins; the
// panel passes their access token as the Authorization header.
// Env: RESEND_API_KEY, LEAD_FROM, SUPABASE_URL, SUPABASE_SERVICE_KEY.

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const NAVY = "#10203D";
const GOLD = "#C08A3E";
const LOGO = "https://georgeponcerealty.pages.dev/apple-touch-icon.png";
const REPLY_TO = "george@georgeponcerealty.com";

// Client-facing wrap: warm letter, not a data table.
function clientEmail(bodyText, lang) {
  const linkify = (escaped) =>
    escaped.replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color: ${GOLD};">${u}</a>`);
  const paras = String(bodyText)
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin: 0 0 14px; font-size: 15px; line-height: 1.7; color: #1B2432;">${linkify(esc(p)).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const tag = lang === "es" ? "Agente Bilingüe" : "Bilingual Realtor";
  return `
  <div style="margin: 0; padding: 20px 8px; background: #f4f1eb;">
    <div style="max-width: 560px; margin: 0 auto; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #ffffff; border: 1px solid #ece7dc; border-radius: 10px; overflow: hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="background: ${NAVY}; padding: 16px 26px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse;"><tr>
              <td style="padding-right: 12px;"><img src="${LOGO}" alt="" width="38" height="38" style="display: block; border: 0; border-radius: 7px;"></td>
              <td>
                <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: 700; color: #ffffff;">George Ponce</div>
                <div style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #E8C98A;">${esc(tag)}</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="height: 3px; background: ${GOLD}; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr><td style="padding: 26px 28px 8px;">${paras}</td></tr>
        <tr>
          <td style="padding: 8px 28px 22px;">
            <div style="border-top: 1px solid rgba(16,32,61,0.1); padding-top: 14px; font-size: 13px; line-height: 1.7; color: #6B7480;">
              <strong style="color: ${NAVY};">George Ponce</strong> &middot; ${esc(tag)}<br>
              <a href="tel:+16238535241" style="color: ${GOLD}; text-decoration: none;">(623) 853-5241</a> &middot;
              <a href="mailto:george@georgeponcerealty.com" style="color: ${GOLD}; text-decoration: none;">george@georgeponcerealty.com</a><br>
              <span style="font-size: 11.5px;">CENTURY 21 Northwest Realty &middot; Equal Housing Opportunity</span>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>`;
}

export async function onRequestPost(context) {
  const { RESEND_API_KEY, LEAD_FROM, SUPABASE_URL, SUPABASE_SERVICE_KEY } = context.env;
  if (!RESEND_API_KEY || !LEAD_FROM || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response("Not configured", { status: 500 });
  }
  const svc = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  // 1. Who is calling? Verify their Supabase access token.
  const userToken = context.request.headers.get("Authorization") || "";
  const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: userToken, apikey: SUPABASE_SERVICE_KEY },
  });
  if (!uRes.ok) return new Response("Not signed in", { status: 401 });
  const user = await uRes.json();

  // 2. Are they on the admin list?
  const aRes = await fetch(
    `${SUPABASE_URL}/rest/v1/gp_admins?user_id=eq.${user.id}&select=user_id`,
    { headers: svc }
  );
  const admins = aRes.ok ? await aRes.json() : [];
  if (!admins.length) return new Response("Not authorized", { status: 403 });

  // 3. The request.
  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const { contact_id, template, subject, message } = body || {};
  if (!contact_id || !subject || !message) {
    return new Response("Missing contact_id, subject, or message", { status: 400 });
  }

  // 4. The contact (service key; RLS not in play server-side).
  const cRes = await fetch(
    `${SUPABASE_URL}/rest/v1/gp_contacts?id=eq.${contact_id}&select=*`,
    { headers: svc }
  );
  const rows = cRes.ok ? await cRes.json() : [];
  const contact = rows[0];
  if (!contact) return new Response("Contact not found", { status: 404 });
  if (!contact.email) return new Response("Contact has no email address", { status: 400 });

  // 5. Send.
  const html = clientEmail(message, contact.language);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: LEAD_FROM,
      to: [contact.email],
      reply_to: REPLY_TO,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error("send-client-email: Resend error", res.status, await res.text());
    return new Response("Send failed", { status: 502 });
  }

  // 6. Log it (best effort; the send already happened).
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/gp_email_log`, {
      method: "POST",
      headers: { ...svc, Prefer: "return=minimal" },
      body: JSON.stringify({
        contact_id,
        to_email: contact.email,
        template: template || "custom",
        subject,
        sent_by: user.email || user.id,
      }),
    });
  } catch (err) {
    console.error("send-client-email: log failed", err);
  }

  return Response.json({ ok: true });
}
