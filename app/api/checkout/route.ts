// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  photoId?: string; // puede venir slug o docId
  mode?: "view" | "download";
};

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  try {
    return new URL(req.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function isHidden(data: any) {
  return data?.hidden === true;
}

function createdAtMillis(data: any): number {
  const v = data?.createdAt;
  // admin Timestamp tiene .toMillis()
  if (v?.toMillis) return v.toMillis();
  // por si llega como Date/string/number
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  return 0;
}

async function findPhotoByIdOrSlug(db: FirebaseFirestore.Firestore, idOrSlug: string) {
  // 1) por docId
  const byId = await db.collection("photos").doc(idOrSlug).get();
  if (byId.exists) return { id: byId.id, ...(byId.data() as any) };

  // 2) por slug (✅ robusto ante slugs duplicados y hidden:true)
  const q = await db.collection("photos").where("slug", "==", idOrSlug).limit(10).get();
  if (q.empty) return null;

  // Elegimos el mejor candidato: NO oculto y más reciente
  const candidates = q.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((p) => !isHidden(p));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => createdAtMillis(b) - createdAtMillis(a));
  return candidates[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    const idOrSlug = (body?.photoId || "").toString().trim();
    const mode = body?.mode === "download" ? "download" : "view";

    if (!idOrSlug) {
      return NextResponse.json({ error: "missing_photoId" }, { status: 400 });
    }

    const accessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();
    if (!accessToken) {
      return NextResponse.json({ error: "missing_MERCADOPAGO_ACCESS_TOKEN" }, { status: 500 });
    }

    const db = getAdminDb();
    const photo = await findPhotoByIdOrSlug(db, idOrSlug);

    if (!photo) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Seguridad: si está oculto por moderación => no se vende
    if (photo.hidden === true) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const price =
      mode === "download"
        ? Number(photo.priceDownload ?? NaN)
        : Number(photo.priceView ?? NaN);

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "invalid_price" }, { status: 400 });
    }

    const baseUrl = getBaseUrl(req);
    const publicId = encodeURIComponent(photo.slug || photo.id);

    const back_urls = {
      success: `${baseUrl}/mi-foto/${publicId}?status=success`,
      pending: `${baseUrl}/mi-foto/${publicId}?status=pending`,
      failure: `${baseUrl}/mi-foto/${publicId}?status=failure`,
    };

    // notification_url solo en https
    const webhookToken = (process.env.MERCADOPAGO_WEBHOOK_TOKEN || "").trim();
    const canUseNotificationUrl = baseUrl.startsWith("https://") && webhookToken.length > 0;

    const preferencePayload: any = {
      items: [
        {
          title: photo.title || "UnlockMe - Foto",
          quantity: 1,
          unit_price: price,
          currency_id: "MXN",
        },
      ],
      back_urls,
      auto_return: "approved",
      external_reference: `${photo.id}|${mode}`, // SIEMPRE docId real para webhook
    };

    if (canUseNotificationUrl) {
      preferencePayload.notification_url = `${baseUrl}/api/mercadopago/webhook?token=${encodeURIComponent(
        webhookToken
      )}`;
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const raw = await mpRes.text();
    let mpJson: any = null;
    try {
      mpJson = JSON.parse(raw);
    } catch {}

    if (!mpRes.ok) {
      return NextResponse.json(
        {
          error: "mp_preference_failed",
          status: mpRes.status,
          mp: mpJson || raw.slice(0, 400),
        },
        { status: 502 }
      );
    }

    const url = mpJson?.init_point || mpJson?.sandbox_init_point;
    if (!url) {
      return NextResponse.json({ error: "missing_init_point", mp: mpJson }, { status: 502 });
    }

    return NextResponse.json({ url }, { status: 200 });
  } catch (e) {
    console.error("checkout error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
