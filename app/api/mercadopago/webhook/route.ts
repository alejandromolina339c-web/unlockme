// app/api/mercadopago/webhook/route.ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

function getTokenFromRequest(reqUrl: string) {
  const url = new URL(reqUrl);
  return (url.searchParams.get("token") || "").trim();
}

function getTopicFromRequest(reqUrl: string, body: any) {
  const url = new URL(reqUrl);

  // MP puede mandar "topic" o "type"
  const qTopic = (url.searchParams.get("topic") || url.searchParams.get("type") || "").trim();
  const bTopic = (body?.topic || body?.type || "").toString().trim();

  return (qTopic || bTopic).toLowerCase();
}

// ✅ Extrae un ID numérico desde cosas como:
// - "123456789"
// - "https://api.mercadopago.com/v1/payments/123456789"
// - "checkout_merchant_order-123456789" (si trae dígitos)
function extractNumericId(input: string | null | undefined) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  // Si viene como URL, tomar el último segmento
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const u = new URL(raw);
      const last = u.pathname.split("/").filter(Boolean).pop() || "";
      const m = last.match(/\d+/g);
      return m ? m[m.length - 1] : null;
    }
  } catch {
    // ignore
  }

  // Si viene mezclado, toma el último bloque de dígitos
  const matches = raw.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  return matches[matches.length - 1];
}

function getIdFromRequest(reqUrl: string, body: any) {
  const url = new URL(reqUrl);

  // MP puede enviar el id así:
  // 1) body.data.id
  // 2) body.id (a veces)
  // 3) body.resource (URL)
  // 4) query data.id (data.id=123)
  // 5) query id / payment_id
  // 6) query resource (URL)
  const bodyId = body?.data?.id ? String(body.data.id) : null;
  const bodyPlainId = body?.id ? String(body.id) : null;
  const bodyResource = body?.resource ? String(body.resource) : null;

  const queryId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    url.searchParams.get("payment_id");

  const queryResource = url.searchParams.get("resource");

  // Preferimos el ID directo si viene, si no, intentamos extraer desde "resource"
  const direct = String(bodyId || bodyPlainId || queryId || "").trim();
  if (direct) return direct;

  const resource = String(bodyResource || queryResource || "").trim();
  if (resource) {
    const extracted = extractNumericId(resource);
    if (extracted) return extracted;
  }

  return null;
}

async function fetchMpJson(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  // Healthcheck simple
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "MERCADOPAGO_ACCESS_TOKEN missing" },
        { status: 500 }
      );
    }

    // ✅ Seguridad extra: token secreto en la URL del webhook
    const expectedToken = (process.env.MERCADOPAGO_WEBHOOK_TOKEN || "").trim();
    if (expectedToken) {
      const gotToken = getTokenFromRequest(req.url);
      if (!gotToken || gotToken !== expectedToken) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const topic = getTopicFromRequest(req.url, body);
    const incomingIdRaw = getIdFromRequest(req.url, body);

    // Si no hay id, respondemos 200 para que MP no reintente sin sentido
    if (!incomingIdRaw) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ✅ Si llega algo tipo "checkout_merchant_order-...." intentamos rescatar dígitos
    const incomingIdNumeric = extractNumericId(incomingIdRaw);
    const incomingId = incomingIdNumeric || String(incomingIdRaw);

    // 1) Resolver uno o varios paymentIds según el tipo de notificación
    let paymentIds: string[] = [];

    // Merchant order (muy común que MP mande esto)
    if (topic.includes("merchant_order")) {
      // Solo tiene sentido si hay un ID numérico real de merchant_order
      const moId = extractNumericId(incomingId);
      const mo = moId
        ? await fetchMpJson(
            `https://api.mercadopago.com/merchant_orders/${moId}`,
            accessToken
          )
        : null;

      const moPayments = Array.isArray(mo?.payments) ? mo.payments : [];
      paymentIds = moPayments
        .map((p: any) => (p?.id ? String(p.id) : ""))
        .filter((x: string) => x.trim().length > 0);

      // ✅ Fallback: si no pudimos resolver merchant_order, probamos como payment directo
      if (paymentIds.length === 0) {
        paymentIds = [String(incomingId)];
      }
    } else {
      // Asumimos payment directo
      paymentIds = [String(incomingId)];
    }

    if (paymentIds.length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const db = getAdminDb();

    // 2) Procesar cada payment (idempotente por paymentId)
    for (const paymentId of paymentIds) {
      // a) Confirmar pago real con MP (NO confiar en body del webhook)
      const payment = await fetchMpJson(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        accessToken
      );

      if (!payment) continue;

      // Solo approved suma ganancias
      if (payment?.status !== "approved") continue;

      // En tu checkout: external_reference = photoId (o slug)
      const ext = String(payment?.external_reference ?? "").trim();
      if (!ext) continue;

      // Soporta futuro "photoId|view" o "photoId|download"
      const [photoKey, modeRaw] = ext.split("|");
      const mode = modeRaw === "download" ? "download" : "view";

      const paidAmount = Number(payment?.transaction_amount ?? 0);

      // b) Idempotencia (no duplicar sumas)
      const paymentRef = db.collection("mp_payments").doc(String(paymentId));
      const already = await paymentRef.get();
      if (already.exists) continue;

      // c) Buscar la foto por docId o slug
      let photoRef = db.collection("photos").doc(photoKey);
      let photoSnap = await photoRef.get();

      if (!photoSnap.exists) {
        const q = await db.collection("photos").where("slug", "==", photoKey).limit(1).get();
        if (!q.empty) {
          photoRef = q.docs[0].ref;
          photoSnap = await photoRef.get();
        }
      }

      if (!photoSnap.exists) {
        // Guardamos como procesado para evitar reintentos duplicados
        await paymentRef.set({
          createdAt: new Date(),
          mp_payment_id: String(paymentId),
          status: payment?.status ?? null,
          external_reference: ext,
          note: "photo_not_found",
        });
        continue;
      }

      const photo = photoSnap.data() as any;

      // Validación mínima contra precio guardado
      const priceView = Number(photo?.priceView ?? 0);
      const priceDownload = Number(photo?.priceDownload ?? 0);

      // Si no viene mode en external_reference, inferimos por monto (compat)
      let finalMode: "view" | "download" = mode as "view" | "download";
      if (!modeRaw) {
        const eq = (a: number, b: number) => Math.abs(a - b) < 0.01;
        if (priceDownload > 0 && eq(paidAmount, priceDownload) && !eq(priceDownload, priceView)) {
          finalMode = "download";
        } else {
          finalMode = "view";
        }
      }

      const expected = finalMode === "download" ? priceDownload : priceView;
      const canValidate = expected > 0;
      const matchesExpected = !canValidate || Math.abs(paidAmount - expected) < 0.01;

      await db.runTransaction(async (tx) => {
        const again = await tx.get(paymentRef);
        if (again.exists) return;

        const latestPhoto = await tx.get(photoRef);
        if (!latestPhoto.exists) return;

        // Guardar payment (idempotencia)
        tx.set(paymentRef, {
          createdAt: new Date(),
          mp_payment_id: String(paymentId),
          status: payment?.status ?? null,
          external_reference: ext,
          mode: finalMode,
          amount: paidAmount,
          amountMatchesExpected: matchesExpected,
        });

        if (!matchesExpected) return;

        const p = latestPhoto.data() as any;

        const earningsView = Number(p?.earningsView ?? 0);
        const earningsDownload = Number(p?.earningsDownload ?? 0);
        const purchasesView = Number(p?.purchasesView ?? 0);
        const purchasesDownload = Number(p?.purchasesDownload ?? 0);

        tx.update(photoRef, {
          earningsView: finalMode === "view" ? earningsView + paidAmount : earningsView,
          earningsDownload:
            finalMode === "download" ? earningsDownload + paidAmount : earningsDownload,
          purchasesView: finalMode === "view" ? purchasesView + 1 : purchasesView,
          purchasesDownload: finalMode === "download" ? purchasesDownload + 1 : purchasesDownload,
          updatedAt: new Date(),
        });
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("MP webhook error:", err);
    // Respondemos 200 para no bloquear reintentos de MP
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
