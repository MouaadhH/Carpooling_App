const CHARGILY_API_URL =
    process.env.CHARGILY_MODE === "live"
        ? "https://pay.chargily.net/api/v2"
        : "https://pay.chargily.net/test/api/v2";

const CHARGILY_API_SECRET_KEY =
    process.env.CHARGILY_API_SECRET_KEY;

async function createCheckout({ amount, rechargeRequestId }) {

    if (!CHARGILY_API_SECRET_KEY) {
        throw new Error("CHARGILY_API_SECRET_KEY is not configured");
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
            // after the frontend is ready, this should be changed
            // to the actual frontend URL

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

module.exports = {
    createCheckout,
};

