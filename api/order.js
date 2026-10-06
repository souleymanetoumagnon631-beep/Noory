const MAX_BODY_BYTES = 20_000;

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function clean(value, maxLength) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRequestId(value) {
  return /^[a-zA-Z0-9_-]{8,128}$/.test(value);
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const toRaw = process.env.ORDER_TO_EMAIL;

  if (!apiKey || !from || !toRaw) {
    console.error("Missing Resend environment variables.");
    return json(
      { error: "Le service email n’est pas encore configuré." },
      503,
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "Format de requête invalide." }, 415);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: "Requête trop volumineuse." }, 413);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "JSON invalide." }, 400);
  }

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 32);
  const zone = clean(body.zone, 120);
  const email = clean(body.email, 160);
  const note = clean(body.note, 600);
  const company = clean(body.company, 120);
  const requestId = clean(body.requestId, 128);
  const quantity = Number(body.quantity);

  // Honeypot: return success without sending, so bots get no useful signal.
  if (company) {
    return json({ ok: true });
  }

  if (!name || name.length < 2) {
    return json({ error: "Nom invalide." }, 400);
  }

  if (!phone || phone.length < 6) {
    return json({ error: "Numéro de téléphone invalide." }, 400);
  }

  if (!zone || zone.length < 2) {
    return json({ error: "Zone de livraison invalide." }, 400);
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    return json({ error: "Quantité invalide." }, 400);
  }

  if (!isEmail(email)) {
    return json({ error: "Adresse email invalide." }, 400);
  }

  if (!isRequestId(requestId)) {
    return json({ error: "Identifiant de requête invalide." }, 400);
  }

  const unitPrice = 15000;
  const total = unitPrice * quantity;
  const totalFormatted = new Intl.NumberFormat("fr-FR").format(total);
  const to = toRaw
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (to.length === 0) {
    return json({ error: "Destinataire email non configuré." }, 503);
  }

  const safe = {
    name: escapeHtml(name),
    phone: escapeHtml(phone),
    zone: escapeHtml(zone),
    email: escapeHtml(email || "Non renseigné"),
    note: escapeHtml(note || "Aucune"),
  };

  const subject = `Nouvelle demande iTasbih Salam — ${name}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#100904;padding:28px;color:#ffedd7">
      <div style="max-width:620px;margin:0 auto;border:1px solid #40372e;border-radius:12px;padding:28px">
        <div style="font-size:12px;color:#d7ad56;text-transform:uppercase;margin-bottom:12px">
          Nouvelle demande de commande
        </div>
        <h1 style="font-size:28px;line-height:1.1;margin:0 0 24px;color:#ffedd7">
          iTasbih Salam
        </h1>

        <table role="presentation" style="width:100%;border-collapse:collapse;color:#ffedd7">
          <tr>
            <td style="padding:9px 0;color:#b9a997">Client</td>
            <td style="padding:9px 0;text-align:right">${safe.name}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#b9a997">Téléphone</td>
            <td style="padding:9px 0;text-align:right">${safe.phone}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#b9a997">Zone</td>
            <td style="padding:9px 0;text-align:right">${safe.zone}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#b9a997">Quantité</td>
            <td style="padding:9px 0;text-align:right">${quantity}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#b9a997">Total produit</td>
            <td style="padding:9px 0;text-align:right;color:#f2d995;font-weight:bold">
              ${totalFormatted} FCFA
            </td>
          </tr>
          <tr>
            <td style="padding:9px 0;color:#b9a997">Email</td>
            <td style="padding:9px 0;text-align:right">${safe.email}</td>
          </tr>
        </table>

        <div style="border-top:1px dashed #40372e;margin-top:20px;padding-top:20px">
          <div style="font-size:12px;color:#b9a997;margin-bottom:6px">PRÉCISION CLIENT</div>
          <div style="line-height:1.55">${safe.note}</div>
        </div>

        <div style="border-top:1px dashed #40372e;margin-top:20px;padding-top:16px;font-size:11px;color:#7f7265">
          Référence : ${escapeHtml(requestId)}
        </div>
      </div>
    </div>
  `;

  const text = [
    "Nouvelle demande iTasbih Salam",
    "",
    `Client: ${name}`,
    `Téléphone: ${phone}`,
    `Zone: ${zone}`,
    `Quantité: ${quantity}`,
    `Total produit: ${totalFormatted} FCFA`,
    `Email: ${email || "Non renseigné"}`,
    `Précision: ${note || "Aucune"}`,
    `Référence: ${requestId}`,
  ].join("\n");

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `itasbih-order/${requestId}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  const resendData = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    console.error("Resend API error:", {
      status: resendResponse.status,
      response: resendData,
    });

    if (resendResponse.status === 429) {
      return json(
        { error: "Trop de demandes. Réessayez dans quelques instants." },
        429,
      );
    }

    return json(
      { error: "Impossible d’envoyer la demande pour le moment." },
      502,
    );
  }

  return json({
    ok: true,
    id: resendData.id ?? null,
  });
}

export function GET() {
  return json({ ok: true, service: "itasbih-order-email" });
}
