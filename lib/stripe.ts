// lib/stripe.ts
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("Falta STRIPE_SECRET_KEY en .env.local");
}

// No especificamos apiVersion para evitar el error de tipos.
// Stripe usará la versión configurada en tu cuenta.
export const stripe = new Stripe(secretKey as string);
