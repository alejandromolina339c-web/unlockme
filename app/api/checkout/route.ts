// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Espera un body JSON:
 * {
 *   photoId: string;
 *   title: string;
 *   price: number;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { photoId, title, price } = await req.json();

    if (!photoId || !title || !price) {
      return NextResponse.json(
        { error: "Faltan datos para crear el checkout" },
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
              name: title || "Foto premium Mi-Foto",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/mi-foto/${photoId}?status=success`,
      cancel_url: `${APP_URL}/mi-foto/${photoId}?status=cancel`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "No se pudo generar la URL de pago." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Error en /api/checkout:", err);
    return NextResponse.json(
      { error: err?.message || "Error creando checkout" },
      { status: 500 }
    );
  }
}
