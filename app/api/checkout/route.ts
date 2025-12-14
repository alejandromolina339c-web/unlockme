// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

// Normalizamos y forzamos HTTPS en la URL base de la app
function getBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Quitamos espacios
  let url = raw.trim();

  // Quitamos cualquier esquema (http:// o https://)
  url = url.replace(/^https?:\/\//i, "");

  // Quitamos barras extra al final
  url = url.replace(/\/+$/, "");

  // Forzamos https:// delante
  return `https://${url}`;
}

const baseUrl = getBaseUrl();

type CheckoutBody = {
  photoId: string; // slug o id del documento
  mode?: "view" | "download";
};

type PhotoData = {
  title?: string;
  priceView?: number;
  priceDownload?: number;
  [key: string]: unknown;
};

type MPResponse = {
  message?: string;
  error?: string;
  init_point?: string;
  sandbox_init_point?: string;
  [key: string]: unknown;
};

export async function POST(req: Request) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  // 🔐 Si no hay token, no intentamos nada
  if (!accessToken) {
    console.error("MERCADOPAGO_ACCESS_TOKEN no está configurado en el entorno");
    return NextResponse.json(
      { error: "Pagos no disponibles en este momento." },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as CheckoutBody | null;

    // Solo exigimos photoId (ya no price/title)
    if (!body || !body.photoId) {
      return NextResponse.json(
        { error: "Faltan datos para crear el checkout" },
        { status: 400 }
      );
    }

    const { photoId, mode } = body;

    // 1️⃣ Buscar la foto en Firestore por slug
    const photosRef = collection(db, "photos");
    const slugQuery = query(photosRef, where("slug", "==", photoId));
    const slugSnap = await getDocs(slugQuery);

    let photoDoc = slugSnap.docs[0] || null;

    // Si no la encontramos por slug, probamos por ID de documento
    if (!photoDoc) {
      const byIdRef = doc(db, "photos", photoId);
      const byIdSnap = await getDoc(byIdRef);
      if (byIdSnap.exists()) {
        photoDoc = byIdSnap;
      }
    }

    if (!photoDoc) {
      console.error("Foto no encontrada para checkout:", photoId);
      return NextResponse.json(
        { error: "Foto no encontrada." },
        { status: 404 }
      );
    }

    const data = photoDoc.data() as PhotoData;

    // 2️⃣ Determinar el precio SOLO desde Firestore (no confiamos en el cliente)
    const rawPriceView = Number(data.priceView ?? 0);
    const rawPriceDownload = Number(data.priceDownload ?? 0);

    const isDownload = mode === "download";

    let finalPrice = rawPriceView;
    let concept = data.title || "Foto premium";

    if (isDownload) {
      // Si es descarga y hay precio de descarga, lo usamos; si no, usamos el de ver
      finalPrice =
        rawPriceDownload > 0 ? rawPriceDownload : rawPriceView;
      concept = `${concept} (descarga)`;
    }

    if (!finalPrice || finalPrice <= 0) {
      console.error(
        "Precio inválido en Firestore para photoId:",
        photoId,
        data
      );
      return NextResponse.json(
        { error: "La foto no tiene un precio válido configurado." },
        { status: 400 }
      );
    }

    // 3️⃣ Crear preferencia en Mercado Pago vía API HTTP
    const mpRes = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: photoDoc.id, // id interno del doc
              title: concept,
              quantity: 1,
              unit_price: finalPrice,
              currency_id: "MXN",
            },
          ],
          back_urls: {
            success: `${baseUrl}/mi-foto/${photoId}?status=success`,
            failure: `${baseUrl}/mi-foto/${photoId}?status=failure`,
            pending: `${baseUrl}/mi-foto/${photoId}?status=pending`,
          },
          auto_return: "approved",
          external_reference: photoDoc.id,
        }),
      }
    );

    const mpData = (await mpRes.json().catch(() => null)) as MPResponse | null;

    if (!mpRes.ok) {
      console.error(
        "Error de Mercado Pago:",
        mpRes.status,
        JSON.stringify(mpData, null, 2)
      );

      const humanMessage =
        (mpData && (mpData.message || mpData.error)) ||
        "Error con la pasarela de pago.";

      return NextResponse.json(
        { error: humanMessage },
        { status: 500 }
      );
    }

    const url = mpData?.init_point || mpData?.sandbox_init_point || null;

    if (!url) {
      console.error("Preferencia creada sin init_point:", mpData);
      return NextResponse.json(
        { error: "No se pudo obtener la URL de pago" },
        { status: 500 }
      );
    }

    // ✅ Devolvemos solo la URL de pago
    return NextResponse.json({ url });
  } catch (err: unknown) {
    console.error("Error en /api/checkout con Mercado Pago:", err);
    return NextResponse.json(
      { error: "Error interno al crear el checkout" },
      { status: 500 }
    );
  }
}
