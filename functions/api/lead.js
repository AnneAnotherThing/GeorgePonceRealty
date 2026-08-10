// Cloudflare Pages Function: POST /api/lead
// Emails get-started form submissions and newsletter signups via Resend.
// Set these in the Cloudflare Pages project (Settings > Environment variables):
//   RESEND_API_KEY, LEAD_TO, LEAD_FROM
// (Same contract as netlify/functions/lead-notify.js; whichever host serves
//  the site answers /api/lead.)

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function onRequestPost(context) {
  let data;
  try {
    data = await context.request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const isNewsletter = data.type === "newsletter";
  const lang = data.lang === "es" ? "Spanish" : "English";

  if (!isNewsletter && !data.phone && !data.email && !data.name) {
    return new Response("Empty submission", { status: 400 });
  }
  if (isNewsletter && !data.email) {
    return new Response("Missing email", { status: 400 });
  }

  const subject = isNewsletter
    ? `Newsletter signup (${lang}): ${data.email}`
    : `New lead (${lang}): ${data.name || "no name"} - ${data.area || "no area"}`;

  const rows = isNewsletter
    ? [["Email", data.email], ["Language", lang], ["Page", data.page]]
    : [
        ["Name", data.name],
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
        ["Page", data.page],
      ];

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px">
      <h2 style="color: #10203D; margin: 0 0 4px">${esc(subject)}</h2>
      <p style="color: #6B7480; margin: 0 0 18px">From georgeponcerealty.com</p>
      <table style="border-collapse: collapse; width: 100%">
        ${rows
          .filter(([, v]) => v)
          .map(
            ([k, v]) => `<tr>
              <td style="padding: 7px 12px 7px 0; color: #6B7480; font-size: 13px; vertical-align: top; white-space: nowrap">${esc(k)}</td>
              <td style="padding: 7px 0; color: #1B2432; font-size: 14px">${esc(v)}</td>
            </tr>`
          )
          .join("")}
      </table>
    </div>`;

  const { RESEND_API_KEY, LEAD_TO, LEAD_FROM } = context.env;
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
  return Response.json({ ok: true });
}
