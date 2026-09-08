// lead-notify: emails get-started form submissions and newsletter signups
// to George via Resend. Needs env vars:
//   RESEND_API_KEY  - Resend API key
//   LEAD_TO         - destination inbox (e.g. george@georgeponcerealty.com)
//   LEAD_FROM       - verified sender (e.g. leads@georgeponcerealty.com)

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Bad JSON" };
  }

  const isNewsletter = data.type === "newsletter";
  const isQuestionnaire = data.type === "questionnaire";
  const lang = data.lang === "es" ? "Spanish" : "English";

  // Honeypot / junk guard: a real submission has at least one contact field.
  if (!isNewsletter && !data.phone && !data.email && !data.name) {
    return { statusCode: 400, body: "Empty submission" };
  }
  if (isNewsletter && !data.email) {
    return { statusCode: 400, body: "Missing email" };
  }

  const subject = isNewsletter
    ? `Newsletter signup (${lang}): ${data.email}`
    : isQuestionnaire
    ? `Renter questionnaire (${lang}): ${data.name || "no name"} — ${data.area || "no area"}`
    : `New lead (${lang}): ${data.name || "no name"} — ${data.area || "no area"}`;

  const rows = isNewsletter
    ? [["Email", data.email], ["Language", lang], ["Page", data.page]]
    : isQuestionnaire
    ? [
        ["Name", data.name],
        ["Qualify check", data.qualify_summary],
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
        ["Page", data.page],
      ]
    : [
        ["Name", data.name],
        ["Buy-ready check", data.buy_summary],
        ["Sell-ready check", data.sell_summary],
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

  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO;
  const from = process.env.LEAD_FROM;
  if (!key || !to || !from) {
    console.error("lead-notify: missing RESEND_API_KEY / LEAD_TO / LEAD_FROM");
    return { statusCode: 500, body: "Not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: data.email || undefined,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("lead-notify: Resend error", res.status, await res.text());
    return { statusCode: 502, body: "Send failed" };
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
