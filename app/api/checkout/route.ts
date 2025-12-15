// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";

function getBaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!raw) return "https://unlockme.com.mx";

  const noProto = raw.replace(/^https?:\/\//, "");
  const noSlash = noProto.replace(/\/+$/, "");
  return `https://${noSlash}`;
}

type CheckoutBody = {
  photoId?: string; // puede ser docId o slug
  mode?: "view" | "download";
  title?: string;
  // compat con tu body viejo
  price?: number;
};

export async function POST(req: Request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Pagos no disponibles en este momento." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as CheckoutBody;

    const photoIdRaw = String(body.photoId || "").trim();
    const mode: "view" | "download" = body.mode === "download" ? "download" : "view";
    const title = String(body.title || "Foto premium").trim();

    if (!photoIdRaw) {
      return NextResponse.json(
        { error: "Faltan datos para crear el checkout." },
        { status: 400 }
      );
    }

    // 1) Buscar foto por docId primero
    let photoDocId = photoIdRaw;
    let snap = await getDoc(doc(db, "photos", photoDocId));

    // 2) Fallback: si no existe, buscar por slug
    if (!snap.exists()) {
      const q = query(
        collection(db, "photos"),
        where("slug", "==", photoIdRaw),
        limit(1)
      );
      const found = await getDocs(q);
      if (!found.empty) {
        photoDocId = found.docs[0].id;
        snap = await getDoc(doc(db, "photos", photoDocId));
      }
    }

    if (!snap.exists()) {
      return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
    }

    const data = snap.data() as any;

    const priceView = Number(data.priceView ?? 0);
    const priceDownload = Number(data.priceDownload ?? 0);

    const unitPrice = mode === "download" ? priceDownload : priceView;

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json(
        { error: "Precio inválido para esta foto." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl();

    // ✅ external_reference: guardamos docId real + modo (ayuda al webhook)
    const external_reference = `${photoDocId}|${mode}`;

    const preferenceBody = {
      items: [
        {
          id: photoDocId,
          title,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: "MXN",
        },
      ],
      back_urls: {
        success: `${baseUrl}/mi-foto/${photoIdRaw}?status=success`,
        failure: `${baseUrl}/mi-foto/${photoIdRaw}?status=failure`,
        pending: `${baseUrl}/mi-foto/${photoIdRaw}?status=pending`,
      },
      auto_return: "approved",
      external_reference,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP preference error:", mpData);
      return NextResponse.json(
        { error: mpData?.message || mpData?.error || "Error con la pasarela de pago." },
        { status: 500 }
      );
    }

    const url = mpData?.init_point || mpData?.sandbox_init_point;
    if (!url) {
      return NextResponse.json({ error: "Mercado Pago no devolvió URL." }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Error creando checkout." }, { status: 500 });
  }
}
