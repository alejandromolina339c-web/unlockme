// app/api/mercadopago/webhook/route.ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

function getPaymentIdFromRequest(reqUrl: string, body: any) {
  const url = new URL(reqUrl);

  // MP puede enviar el id así:
  // 1) body.data.id
  // 2) query data.id (data.id=123)
  // 3) query id / payment_id
  const bodyId = body?.data?.id ? String(body.data.id) : null;

  const queryId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    url.searchParams.get("payment_id");

  const paymentId = String(bodyId || queryId || "").trim();
  return paymentId || null;
}

function getTokenFromRequest(reqUrl: string) {
  const url = new URL(reqUrl);
  return (url.searchParams.get("token") || "").trim();
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

    const paymentId = getPaymentIdFromRequest(req.url, body);
    if (!paymentId) {
      // Respondemos 200 para que MP no reintente sin sentido
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 1) Confirmar pago real con MP (NO confiar en body del webhook)
    const payRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );

    if (!payRes.ok) {
      // MP reintenta luego; no lo bloqueamos
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const payment = await payRes.json();

    // Solo approved suma ganancias
    if (payment?.status !== "approved") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // En tu checkout: external_reference = photoId (PERO puede venir slug)
    const ext = String(payment?.external_reference ?? "").trim();
    if (!ext) return NextResponse.json({ ok: true }, { status: 200 });

    // Soporta futuro "photoId|view" o "photoId|download"
    const [photoKey, modeRaw] = ext.split("|");
    const mode = modeRaw === "download" ? "download" : "view";

    const paidAmount = Number(payment?.transaction_amount ?? 0);

    const db = getAdminDb();

    // 2) Idempotencia: MP puede reintentar el webhook; no queremos duplicar sumas
    const paymentRef = db.collection("mp_payments").doc(String(paymentId));
    const already = await paymentRef.get();
    if (already.exists) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 3) Buscar la foto:
    //    Primero intenta por docId (photoKey)
    //    Si no existe, intenta por slug == photoKey
    let photoRef = db.collection("photos").doc(photoKey);
    let photoSnap = await photoRef.get();

    if (!photoSnap.exists) {
      const q = await db
        .collection("photos")
        .where("slug", "==", photoKey)
        .limit(1)
        .get();

      if (!q.empty) {
        photoRef = q.docs[0].ref;
        photoSnap = await photoRef.get();
      }
    }

    if (!photoSnap.exists) {
      // Guardamos el payment como procesado para evitar reintentos duplicados
      await paymentRef.set({
        createdAt: new Date(),
        mp_payment_id: String(paymentId),
        status: payment?.status ?? null,
        external_reference: ext,
        note: "photo_not_found",
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const photo = photoSnap.data() as any;

    // ✅ Nunca confiar en valores del cliente: usamos monto confirmado por MP
    // y validamos (opcional) contra precios guardados en Firestore.
    const priceView = Number(photo?.priceView ?? 0);
    const priceDownload = Number(photo?.priceDownload ?? 0);

    // Si no viene mode en external_reference, inferimos por monto (compat)
    let finalMode: "view" | "download" = mode as "view" | "download";
    if (!modeRaw) {
      const eq = (a: number, b: number) => Math.abs(a - b) < 0.01;
      if (
        priceDownload > 0 &&
        eq(paidAmount, priceDownload) &&
        !eq(priceDownload, priceView)
      ) {
        finalMode = "download";
      } else {
        finalMode = "view";
      }
    }

    // Validación mínima: si hay precio esperado y no coincide, NO sumamos (seguridad)
    const expected = finalMode === "download" ? priceDownload : priceView;
    const canValidate = expected > 0;
    const matchesExpected = !canValidate || Math.abs(paidAmount - expected) < 0.01;

    await db.runTransaction(async (tx) => {
      const again = await tx.get(paymentRef);
      if (again.exists) return;

      const latestPhoto = await tx.get(photoRef);
      if (!latestPhoto.exists) return;

      // Guardamos siempre el payment para idempotencia
      tx.set(paymentRef, {
        createdAt: new Date(),
        mp_payment_id: String(paymentId),
        status: payment?.status ?? null,
        external_reference: ext,
        mode: finalMode,
        amount: paidAmount,
        amountMatchesExpected: matchesExpected,
      });

      if (!matchesExpected) {
        // Seguridad: no sumamos si no coincide con el precio actual guardado
        return;
      }

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
        purchasesDownload:
          finalMode === "download" ? purchasesDownload + 1 : purchasesDownload,
        updatedAt: new Date(),
      });
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("MP webhook error:", err);
    // Respondemos 200 para no bloquear reintentos de MP
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
