// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: Request) {
  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!mpAccessToken) {
    console.error(
      "Mercado Pago no está configurado (falta MERCADOPAGO_ACCESS_TOKEN)"
    );
    return NextResponse.json(
      { error: "Mercado Pago no está disponible en este momento." },
      { status: 500 }
    );
  }

  const client = new MercadoPagoConfig({
    accessToken: mpAccessToken,
  });

  const preference = new Preference(client);

  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.photoId) {
      return NextResponse.json(
        { error: "Faltan datos para crear el checkout" },
        { status: 400 }
      );
    }

    const {
      photoId,
      mode,
    } = body as {
      photoId: string;
      mode?: "view" | "download";
      // price y title pueden venir, pero los vamos a ignorar para seguridad
      price?: number;
      title?: string;
    };

    const purchaseMode = mode || "view";

    // 1) Buscar la foto en Firestore
    //    Primero intentamos por ID de documento
    let photoDocSnap = await getDoc(doc(db, "photos", photoId));

    if (!photoDocSnap.exists()) {
      // Si no existe por ID, intentamos por slug
      const q = query(
        collection(db, "photos"),
        where("slug", "==", photoId)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        console.warn(
          "[/api/checkout] Foto no encontrada para photoId/slug:",
          photoId
        );
        return NextResponse.json(
          { error: "Foto no encontrada" },
          { status: 404 }
        );
      }

      // Tomamos la primera coincidencia
      photoDocSnap = snap.docs[0];
    }

    const photoData = photoDocSnap.data() as any;

    // 2) Determinar el precio REAL desde Firestore
    let priceFromDb: number | null = null;

    if (purchaseMode === "download") {
      priceFromDb =
        typeof photoData.priceDownload === "number"
          ? photoData.priceDownload
          : null;
    } else {
      // por defecto "view"
      priceFromDb =
        typeof photoData.priceView === "number"
          ? photoData.priceView
          : null;
    }

    // fallback por si en algún momento guardaste "price" a secas
    if (priceFromDb == null && typeof photoData.price === "number") {
      priceFromDb = photoData.price;
    }

    if (!priceFromDb || priceFromDb <= 0) {
      console.error(
        "[/api/checkout] Precio inválido en Firestore para foto:",
        photoDocSnap.id,
        "data:",
        photoData
      );
      return NextResponse.json(
        { error: "Precio inválido para esta foto" },
        { status: 400 }
      );
    }

    const productTitle =
      typeof photoData.title === "string" && photoData.title.trim().length > 0
        ? photoData.title
        : "Foto premium";

    const resolvedPhotoId = photoData.slug || photoDocSnap.id;

    // 3) Crear la preferencia en Mercado Pago usando SOLO el precio de Firestore
    const preferenceData = {
      items: [
        {
          id: resolvedPhotoId,
          title: productTitle,
          quantity: 1,
          unit_price: Number(priceFromDb),
          currency_id: "MXN",
        },
      ],
      back_urls: {
        success: `${appUrl}/mi-foto/${resolvedPhotoId}?status=success`,
        failure: `${appUrl}/mi-foto/${resolvedPhotoId}?status=cancel`,
        pending: `${appUrl}/mi-foto/${resolvedPhotoId}?status=pending`,
      },
      external_reference: resolvedPhotoId,
      metadata: {
        photoDocId: photoDocSnap.id,
        mode: purchaseMode,
      },
    };

    const result: any = await preference.create({
      body: preferenceData,
    });

    const initPoint =
      result?.init_point || result?.sandbox_init_point || null;

    if (!initPoint) {
      console.error(
        "No se obtuvo init_point en la preferencia de Mercado Pago:",
        result
      );
      return NextResponse.json(
        { error: "No se pudo crear el pago en Mercado Pago." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: initPoint });
  } catch (err) {
    console.error("Error en /api/checkout con Mercado Pago:", err);
    return NextResponse.json(
      { error: "Error interno al crear el checkout" },
      { status: 500 }
    );
  }
}
