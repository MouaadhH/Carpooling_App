const express = require("express");

const {
    chargilyWebhookController
} = require("../controllers/chargilyWebhookController");

const router = express.Router();


/*
 * IMPORTANT:
 *
 * Chargily signature verification requires
 * the RAW request body.
 *
 * Therefore this route uses express.raw()
 * instead of express.json().
 */
router.post(
    "/",
    express.raw({
        type: "application/json"
    }),
    chargilyWebhookController
);


module.exports = router;