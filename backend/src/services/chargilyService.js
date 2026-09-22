const crypto = require("crypto");

const CHARGILY_API_URL =
    process.env.CHARGILY_MODE === "live"
        ? "https://pay.chargily.net/api/v2"
        : "https://pay.chargily.net/test/api/v2";

const CHARGILY_API_SECRET_KEY =
    process.env.CHARGILY_API_SECRET_KEY;

const CHARGILY_WEBHOOK_URL =
    process.env.CHARGILY_WEBHOOK_URL;


/*
 * Create a Chargily checkout.
 */
async function createCheckout({ amount, rechargeRequestId }) {

    if (!CHARGILY_API_SECRET_KEY) {
        throw new Error("CHARGILY_API_SECRET_KEY is not configured");
    }

    if (!CHARGILY_WEBHOOK_URL) {
        throw new Error("CHARGILY_WEBHOOK_URL is not configured");
    }

    const response = await fetch(`${CHARGILY_API_URL}/checkouts`, {
        method: "POST",

        headers: {
            Authorization: `Bearer ${CHARGILY_API_SECRET_KEY}`,
            "Content-Type": "application/json",
        },

        body: JSON.stringify({
            amount: Number(amount),
            currency: "dzd",

            success_url:
                "https://example.com/payment/success",

            failure_url:
                process.env.CHARGILY_FAILURE_URL,    

            // Webhook endpoint used by Chargily
            webhook_endpoint:
                process.env.CHARGILY_WEBHOOK_URL,

            metadata: {
                recharge_request_id: String(rechargeRequestId),
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.message || "Failed to create Chargily checkout"
        );
    }

    return data;
}


/*
 * Verify a Chargily webhook signature.
 *
 * Chargily signs the RAW request body using
 * HMAC-SHA256 and the API secret key.
 */
function verifyWebhookSignature(rawBody, signature) {
    if (!CHARGILY_API_SECRET_KEY) {
        throw new Error(
            "CHARGILY_API_SECRET_KEY is not configured"
        );
    }

    if (!signature || !rawBody) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac(
            "sha256",
            CHARGILY_API_SECRET_KEY
        )
        .update(rawBody)
        .digest("hex");

    const expectedBuffer =
        Buffer.from(expectedSignature, "utf8");

    const receivedBuffer =
        Buffer.from(signature, "utf8");

    if (
        expectedBuffer.length !==
        receivedBuffer.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
    );
}


module.exports = {
    createCheckout,
    verifyWebhookSignature
};