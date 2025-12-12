// app/api/checkout/route.ts
import { NextResponse } from "next/server";

// Normalizamos la URL base de la app
function getBaseUrl() {
  // Lo que venga del entorno o localhost como fallback para dev
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Quitamos espacios
  let url = raw.trim();

  // Si NO empieza con http o https, le agregamos https://
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Quitamos cualquier / extra al final
  url = url.replace(/\/+$/, "");

  return url;
}

const baseUrl = getBaseUrl();

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
    const body = await req.json().catch(() => null);

    if (!body || !body.photoId || !body.price || !body.title) {
      return NextResponse.json(
        { error: "Faltan datos para crear el checkout" },
        { status: 400 }
      );
    }

    const { photoId, price, title } = body as {
      photoId: string;
      price: number;
      title: string;
    };

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: "Precio inválido" },
        { status: 400 }
      );
    }

    // 🧾 Llamamos directamente a la API de Mercado Pago
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
              id: photoId,
              title: title || "Foto premium",
              quantity: 1,
              unit_price: Number(price),
              currency_id: "MXN",
            },
          ],
          back_urls: {
            success: `${baseUrl}/mi-foto/${photoId}?status=success`,
            failure: `${baseUrl}/mi-foto/${photoId}?status=failure`,
            pending: `${baseUrl}/mi-foto/${photoId}?status=pending`,
          },
          auto_return: "approved",
          external_reference: photoId,
        }),
      }
    );

    const mpData = await mpRes.json().catch(() => null);

    if (!mpRes.ok) {
      console.error(
        "Error de Mercado Pago:",
        mpRes.status,
        JSON.stringify(mpData, null, 2)
      );
      return NextResponse.json(
        { error: "Error con la pasarela de pago." },
        { status: 500 }
      );
    }

    const url =
      (mpData as any).init_point ||
      (mpData as any).sandbox_init_point ||
      null;

    if (!url) {
      console.error("Preferencia creada sin init_point:", mpData);
      return NextResponse.json(
        { error: "No se pudo obtener la URL de pago" },
        { status: 500 }
      );
    }

    // ✅ Igual que antes: devolvemos { url } para que el front redirija
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error(
      "Error en /api/checkout con Mercado Pago:",
      typeof err === "object" ? JSON.stringify(err, null, 2) : err
    );
    return NextResponse.json(
      { error: "Error interno al crear el checkout" },
      { status: 500 }
    );
  }
}
