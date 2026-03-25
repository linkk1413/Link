require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = global.fetch || require("node-fetch");
const Stripe = require("stripe");
const emailRouter = require("./src/routes/email");
const moyasarRouter = require("./src/routes/moyasar");

const app = express();
const PORT = process.env.PORT || 4242;

app.use(cors());
app.use(express.json());

// Moyasar routes
app.use("/moyasar", moyasarRouter);

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const orderMetaCache = new Map();

// Cache for access token (PayPal tokens last ~9 hours)
let cachedAccessToken = null;
let tokenExpiresAt = 0;

// Cache for exchange rate (refresh every 10 minutes)
let cachedFxRate = null;
let fxRateExpiresAt = 0;
const FX_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FX rate failed: ${response.status} ${error}`);
  }
  return response.json();
};

const getSarToUsdRate = async () => {
  // Return cached rate if still valid
  if (cachedFxRate && Date.now() < fxRateExpiresAt) {
    return cachedFxRate;
  }

  try {
    const data = await fetchJson("https://open.er-api.com/v6/latest/SAR");
    const rate = data?.rates?.USD;
    if (rate) {
      cachedFxRate = Number(rate);
      fxRateExpiresAt = Date.now() + FX_CACHE_TTL;
      return cachedFxRate;
    }
  } catch (error) {
    console.warn("ER-API FX failed:", error.message);
  }

  try {
    const data = await fetchJson(
      "https://api.exchangerate.host/latest?base=SAR&symbols=USD",
    );
    const rate = data?.rates?.USD;
    if (rate) {
      cachedFxRate = Number(rate);
      fxRateExpiresAt = Date.now() + FX_CACHE_TTL;
      return cachedFxRate;
    }
  } catch (error) {
    console.warn("ExchangeRate.host FX failed:", error.message);
  }

  const fallbackRate = 0.27;
  console.warn("FX rate missing USD. Falling back to", fallbackRate);
  cachedFxRate = fallbackRate;
  fxRateExpiresAt = Date.now() + FX_CACHE_TTL;
  return fallbackRate;
};

const getAccessToken = async () => {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("Missing PayPal credentials");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  // PayPal tokens typically expire in ~9 hours (32400 seconds)
  tokenExpiresAt = Date.now() + (data.expires_in || 32400) * 1000;
  return cachedAccessToken;
};

// Handler function for PayPal create order
const handlePayPalCreateOrder = async (req, res) => {
  try {
    const { amountSar } = req.body;
    if (!amountSar) {
      return res.status(400).json({ error: "Missing amountSar" });
    }

    // Fetch FX rate and access token in parallel for speed
    const [fxRate, accessToken] = await Promise.all([
      getSarToUsdRate(),
      getAccessToken(),
    ]);
    
    const amountUsd = Number(amountSar) * fxRate;

    if (!Number.isFinite(amountUsd)) {
      return res.status(400).json({ error: "Invalid SAR amount" });
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: Number(amountUsd).toFixed(2),
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("PayPal create order error:", response.status, error);
      return res.status(500).json({ error });
    }

    const data = await response.json();
    orderMetaCache.set(data.id, {
      amountUsd: Number(amountUsd.toFixed(2)),
      fxRate,
    });
    return res.json({
      orderId: data.id,
      amountUsd: Number(amountUsd.toFixed(2)),
      fxRate,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create order" });
  }
};

// Handler function for PayPal order meta
const handlePayPalOrderMeta = async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  const meta = orderMetaCache.get(orderId);
  if (!meta) {
    return res.status(404).json({ error: "Order meta not found" });
  }

  return res.json(meta);
};

// Original endpoints
app.post("/paypal/create-order", handlePayPalCreateOrder);
app.post("/paypal/order-meta", handlePayPalOrderMeta);

// Firebase Functions compatible endpoints (used by frontend)
app.post("/paypalCreateOrder", handlePayPalCreateOrder);
app.post("/paypalOrderMeta", handlePayPalOrderMeta);

app.post("/paypal/capture-authorization", async (req, res) => {
  try {
    const { authorizationId } = req.body;
    if (!authorizationId) {
      return res.status(400).json({ error: "Missing authorizationId" });
    }

    const accessToken = await getAccessToken();
    const response = await fetch(
      `${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("PayPal capture error:", response.status, error);
      return res.status(500).json({ error });
    }

    const data = await response.json();
    return res.json({ captureId: data.id, status: data.status });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to capture authorization" });
  }
});

app.post("/paypal/void-authorization", async (req, res) => {
  try {
    const { authorizationId } = req.body;
    if (!authorizationId) {
      return res.status(400).json({ error: "Missing authorizationId" });
    }

    const accessToken = await getAccessToken();
    const response = await fetch(
      `${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/void`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("PayPal void error:", response.status, error);
      return res.status(500).json({ error });
    }

    return res.json({ status: "VOIDED" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to void authorization" });
  }
});

app.post("/stripe/create-payment-intent", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { amountSar } = req.body;
    if (!amountSar) {
      return res.status(400).json({ error: "Missing amountSar" });
    }

    const amount = Math.round(Number(amountSar) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "sar",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe create intent error:", error);
    return res.status(500).json({ error: "Failed to create payment intent" });
  }
});

// Email routes
app.use("/api/auth", emailRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`PayPal server running on port ${PORT}`);
});
