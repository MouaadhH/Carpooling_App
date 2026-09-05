const express = require("express");

const {
    getWalletController,
    getWalletTransactionsController,
    createWalletController,
    withdrawController
} = require("../controllers/walletController");

const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();


/*
    Get current user's wallet
*/
router.get(
    "/",
    authenticateToken,
    getWalletController
);


/*
    Get current user's wallet transactions
*/
router.get(
    "/transactions",
    authenticateToken,
    getWalletTransactionsController
);


/*
    Create wallet for current user
*/
router.post(
    "/",
    authenticateToken,
    createWalletController
);

router.post(
    "/withdraw",
    authenticateToken,
    withdrawController
);

module.exports = router;