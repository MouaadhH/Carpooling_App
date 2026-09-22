const {
    verifyWebhookSignature
} = require("../services/chargilyService");

const {
    approveRecharge,
    rejectRecharge,
    getRechargeRequestById
} = require("../services/rechargeService");


/*
 * Handle Chargily webhook.
 *
 * POST /api/webhooks/chargily
 */
const chargilyWebhookController = async (req, res) => {
    console.log("🔥 CHARGILY WEBHOOK ROUTE HIT");
    try {

        /*
         * express.raw() gives us the original
         * request body as a Buffer.
         */
        const rawBody = req.body;

        if (!Buffer.isBuffer(rawBody)) {
            console.error(
                "CHARGILY WEBHOOK: Raw body is not available"
            );

            return res.status(400).json({
                message: "Invalid webhook body"
            });
        }


        /*
         * Chargily sends the signature
         * in the "signature" header.
         */
        const signature = req.get("signature");


        /*
         * Verify that the webhook really came
         * from Chargily and wasn't modified.
         */
        const isValid = verifyWebhookSignature(
            rawBody,
            signature
        );

        if (!isValid) {

            console.error(
                "CHARGILY WEBHOOK: Invalid signature"
            );

            return res.status(403).json({
                message: "Invalid webhook signature"
            });
        }


        /*
         * Only parse JSON AFTER signature verification.
         */
        const event = JSON.parse(
            rawBody.toString("utf8")
        );

        console.log(
            "CHARGILY WEBHOOK EVENT:",
            event.type
        );


        /*
         * The checkout object is contained
         * inside event.data.
         */
        const checkout = event.data;

        if (!checkout) {
            return res.status(400).json({
                message: "Invalid Chargily webhook payload"
            });
        }


        /*
         * Get our Wassalni recharge request ID
         * from the metadata we attached when
         * creating the checkout.
         */
        const rechargeRequestId =
            checkout.metadata?.recharge_request_id;


        if (!rechargeRequestId) {

            console.error(
                "CHARGILY WEBHOOK: Missing recharge_request_id"
            );

            return res.status(400).json({
                message: "Recharge request ID is missing"
            });
        }


        /*
         * PAYMENT SUCCESS
         */
    if (event.type === "checkout.paid") {

        // Get the original Wassalni recharge request
        const rechargeRequest =
            await getRechargeRequestById({
                id_request_recharge:
                    rechargeRequestId
            });
    
        // Verify currency
        const chargilyCurrency =
            String(checkout.currency || "").toLowerCase();
    
        if (chargilyCurrency !== "dzd") {
    
            console.error(
                "CHARGILY WEBHOOK: Currency mismatch",
                {
                    rechargeRequestId,
                    expected: "dzd",
                    received: checkout.currency
                }
            );
    
            return res.status(400).json({
                message: "Payment currency does not match"
            });
        }
    
        // Verify amount
        const chargilyAmount =
            Number(checkout.amount);
    
        const rechargeAmount =
            Number(rechargeRequest.amount);
    
        if (
            !Number.isFinite(chargilyAmount) ||
            chargilyAmount !== rechargeAmount
        ) {
    
            console.error(
                "CHARGILY WEBHOOK: Amount mismatch",
                {
                    rechargeRequestId,
                    expected: rechargeAmount,
                    received: checkout.amount
                }
            );
    
            return res.status(400).json({
                message: "Payment amount does not match"
            });
        }
    
        console.log(
            `Chargily payment successful for recharge ${rechargeRequestId}`
        );
    
        const result = await approveRecharge({
            id_request_recharge:
                rechargeRequestId
        });
    
        console.log(
            "RECHARGE APPROVED:",
            result
        );
    
        return res.status(200).json({
            message: "Payment processed successfully"
        });
    }


        /*
         * PAYMENT FAILED / CANCELLED / EXPIRED
         */
        if (
            event.type === "checkout.failed" ||
            event.type === "checkout.canceled" ||
            event.type === "checkout.expired"
        ) {

            console.log(
                `Chargily payment failed for recharge ${rechargeRequestId}`
            );

            const result = await rejectRecharge({
                id_request_recharge:
                    rechargeRequestId
            });

            console.log(
                "RECHARGE REJECTED:",
                result
            );

            return res.status(200).json({
                message: "Payment failure processed"
            });
        }


        /*
         * Other events:
         *
         * checkout.pending
         * checkout.processing
         *
         * We don't change the wallet yet.
         */
        console.log(
            `Chargily event ${event.type} received. No action required.`
        );

        return res.status(200).json({
            message: "Webhook received"
        });

    } catch (error) {

        console.error(
            "CHARGILY WEBHOOK ERROR:",
            error
        );

        return res.status(500).json({
            message: "Webhook processing failed"
        });
    }
};


module.exports = {
    chargilyWebhookController
};
