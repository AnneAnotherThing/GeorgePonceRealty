// Cloudflare Pages Function: POST /api/lead
// Emails form submissions to George via Resend, styled in the site's navy and
// gold, and (when configured) also records the event in the gp_ CRM tables.
// Env vars (Cloudflare Pages > Settings > Variables and secrets):
//   RESEND_API_KEY, LEAD_TO, LEAD_FROM            - required, email delivery
//   SUPABASE_URL, SUPABASE_SERVICE_KEY            - optional, CRM capture
// (Same contract as netlify/functions/lead-notify.js; whichever host serves
//  the site answers /api/lead.)

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const NAVY = "#10203D";
const GOLD = "#C08A3E";
const INK = "#1B2432";
const MUTED = "#6B7480";
const CREAM = "#FBF6EC";
const LOGO = "https://georgeponcerealty.pages.dev/apple-touch-icon.png";

// One checker readout -> a cream card with a gold rule, one line per finding.
function summaryCard(title, text) {
  if (!text) return "";
  const lines = String(text)
    .split(" | ")
    .map(
      (p) => `<tr>
        <td width="14" valign="top" style="padding: 3px 0; color: ${GOLD}; font-size: 13px; line-height: 1.5;">&#9733;</td>
        <td style="padding: 3px 0; color: ${INK}; font-size: 13.5px; line-height: 1.5;">${esc(p)}</td>
      </tr>`
    )
    .join("");
  return `
    <tr><td style="padding: 14px 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; background: ${CREAM}; border-left: 3px solid ${GOLD}; border-radius: 0 6px 6px 0;">
        <tr><td style="padding: 12px 16px 12px 14px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${GOLD}; margin-bottom: 6px;">${esc(title)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">${lines}</table>
        </td></tr>
      </table>
    </td></tr>`;
}

function actionButton(href, label, bg, color) {
  return `<td style="padding: 0 10px 0 0;">
    <a href="${esc(href)}" style="display: inline-block; background: ${bg}; color: ${color}; font-size: 13.5px; font-weight: 700; text-decoration: none; padding: 11px 22px; border-radius: 5px;">${esc(label)}</a>
  </td>`;
}

function buildEmail({ kicker, headline, subline, actions, summaries, rows, page }) {
  const actionRow = actions.length
    ? `<tr><td style="padding: 16px 24px 2px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse;"><tr>${actions.join("")}</tr></table>
      </td></tr>`
    : "";

  const detailRows = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) => `<tr>
        <td width="150" valign="top" style="padding: 8px 14px 8px 0; color: ${MUTED}; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid rgba(16,32,61,0.08);">${esc(k)}</td>
        <td style="padding: 8px 0; color: ${INK}; font-size: 14px; line-height: 1.5; border-bottom: 1px solid rgba(16,32,61,0.08);">${esc(v)}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="margin: 0; padding: 18px 8px; background: #f4f1eb;">
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #ffffff; border: 1px solid #ece7dc; border-radius: 10px; overflow: hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="background: ${NAVY}; padding: 18px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse;"><tr>
              <td style="padding-right: 14px;"><img src="${LOGO}" alt="" width="44" height="44" style="display: block; border: 0; border-radius: 8px;"></td>
              <td>
                <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 700; color: #ffffff;">George Ponce Realty</div>
                <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #E8C98A; margin-top: 2px;">${esc(kicker)}</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="height: 3px; background: ${GOLD}; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr>
          <td style="padding: 20px 24px 0;">
            <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 700; color: ${NAVY};">${esc(headline)}</div>
            ${subline ? `<div style="font-size: 13px; color: ${MUTED}; margin-top: 4px;">${esc(subline)}</div>` : ""}
          </td>
        </tr>
        ${actionRow}
        ${summaries.map(([t, v]) => summaryCard(t, v)).join("")}
        <tr>
          <td style="padding: 16px 24px 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">${detailRows}</table>
          </td>
        </tr>
        <tr>
          <td style="padding: 14px 24px 18px;">
            <div style="font-size: 11.5px; color: #9aa2ad;">Sent by the georgeponcerealty.com lead pipeline${page ? ` &middot; from ${esc(page)}` : ""}</div>
          </td>
        </tr>
      </table>
    </div>
  </div>`;
}

export async function onRequestPost(context) {
  let data;
  try {
    data = await context.request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const isNewsletter = data.type === "newsletter";
  const isQuestionnaire = data.type === "questionnaire";
  const lang = data.lang === "es" ? "Spanish" : "English";

  if (!isNewsletter && !data.phone && !data.email && !data.name) {
    return new Response("Empty submission", { status: 400 });
  }
  if (isNewsletter && !data.email) {
    return new Response("Missing email", { status: 400 });
  }

  const subject = isNewsletter
    ? `Newsletter signup (${lang}): ${data.email}`
    : isQuestionnaire
    ? `Renter questionnaire (${lang}): ${data.name || "no name"} - ${data.area || "no area"}`
    : `New lead (${lang}): ${data.name || "no name"} - ${data.area || "no area"}`;

  const kicker = (isNewsletter ? "Newsletter signup" : isQuestionnaire ? "Renter questionnaire" : "New lead") + " · " + lang;
  const headline = isNewsletter ? data.email : data.name || data.email || data.phone || "Someone reached out";

  const firstName = (data.name || "").trim().split(/\s+/)[0] || "them";
  const actions = [];
  if (!isNewsletter && data.phone) actions.push(actionButton(`tel:${data.phone}`, `Call ${firstName}`, GOLD, NAVY));
  if (!isNewsletter && data.phone) actions.push(actionButton(`sms:${data.phone}`, "Text", NAVY, "#ffffff"));
  if (data.email) actions.push(actionButton(`mailto:${data.email}`, "Email", NAVY, "#ffffff"));

  const summaries = isNewsletter
    ? []
    : [
        ["Qualify Checker readout", data.qualify_summary],
        ["Ready-to-Buy Checker readout", data.buy_summary],
        ["Ready-to-Sell Checker readout", data.sell_summary],
      ];

  const rows = isNewsletter
    ? [["Email", data.email], ["Language", lang]]
    : isQuestionnaire
    ? [
        ["Lease up", data.lease_end],
        ["Needs keys by", data.move_date],
        ["Paying now", data.current_rent],
        ["Budget", data.budget],
        ["Home type", data.home_type],
        ["Beds / baths", data.beds_baths],
        ["Stories", data.stories],
        ["Pets", data.pets],
        ["Area", data.area],
        ["Special features", data.features],
        ["Appliances needed", data.appliances],
        ["Recently seen/applied", data.applied],
        ["Adults applying", data.adults],
        ["Credit range", data.credit],
        ["Phone", data.phone],
        ["Email", data.email],
        ["Language", lang],
      ]
    : [
        ["Looking in", data.area],
        ["Monthly income", data.income],
        ["Credit range", data.credit],
        ["Current rent", data.current_rent],
        ["Move timing", data.timing],
        ["Household", data.household],
        ["Income type", data.work],
        ["Phone", data.phone],
        ["Email", data.email],
        ["Contact preference", data.contact_pref],
        ["Notes", data.notes],
        ["Language", lang],
      ];

  const html = buildEmail({ kicker, headline, subline: subject, actions, summaries, rows, page: data.page });

  const { RESEND_API_KEY, LEAD_TO, LEAD_FROM, SUPABASE_URL, SUPABASE_SERVICE_KEY } = context.env;
  if (!RESEND_API_KEY || !LEAD_TO || !LEAD_FROM) {
    console.error("lead: missing RESEND_API_KEY / LEAD_TO / LEAD_FROM");
    return new Response("Not configured", { status: 500 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: LEAD_FROM,
      to: [LEAD_TO],
      reply_to: data.email || undefined,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("lead: Resend error", res.status, await res.text());
    return new Response("Send failed", { status: 502 });
  }

  // CRM capture: never blocks the lead. Service key bypasses RLS; the tables
  // have no anon policies at all.
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/gp_lead_events`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          type: data.type || "lead",
          lang: data.lang || "en",
          page: data.page || null,
          name: data.name || null,
          email: data.email || null,
          phone: data.phone || null,
          payload: data,
        }),
      });
      if (!ins.ok) console.error("lead: supabase insert failed", ins.status, await ins.text());
    } catch (err) {
      console.error("lead: supabase insert error", err);
    }
  }

  return Response.json({ ok: true });
}
