import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const accessToken = process.env.MP_ACCESS_TOKEN || "";

export const mp = new MercadoPagoConfig({ accessToken });
export const mpPreference = new Preference(mp);
export const mpPayment = new Payment(mp);

export const mpReady = () => accessToken.length > 0;
