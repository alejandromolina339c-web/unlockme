// app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: Request) {
  // 👇 Leemos la env, pero NO lanzamos throw arriba del todo
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  // 🔐 Si no hay key, respondemos un error desde la API
  if (!stripeSecretKey) {
    console.error("Stripe no está configurado en el entorno del servidor");
    return NextResponse.json(
      { error: "Stripe no está disponible en este momento." },
      { status: 500 }
    );
  }

  // Sin apiVersion para evitar problemas de tipos
  const stripe = new Stripe(stripeSecretKey as string);

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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "mxn",
            unit_amount: Math.round(price * 100),
            product_data: {
              name: title || "Foto premium",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/mi-foto/${photoId}?status=success`,
      cancel_url: `${appUrl}/mi-foto/${photoId}?status=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Error en /api/checkout:", err);
    return NextResponse.json(
      { error: "Error interno al crear el checkout" },
      { status: 500 }
    );
  }
}
