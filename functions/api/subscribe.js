function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function isValidEmail(email) {
  return typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 254;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return jsonResponse({ error: "Please enter a valid email address." }, 400);
  }

  if (!env.RESEND_API_KEY || !env.RESEND_AUDIENCE_ID) {
    return jsonResponse({ error: "Email signup is not configured." }, 500);
  }

  const endpoint = `https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`;

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ email, unsubscribed: false })
    });

    if (!upstream.ok) {
      return jsonResponse({ error: "Subscription could not be saved." }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ error: "Subscription service unavailable." }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  return onRequestPost(context);
}
