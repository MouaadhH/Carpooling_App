const {
    getWalletByUserId,
    getWalletTransactions,
    createWallet,
    withdrawFromWallet
} = require("../services/walletService");


/*
    GET /api/wallet

    Get the authenticated user's wallet.
*/
const getWalletController = async (req, res) => {
    try {
        const id_user = req.user.id_user;

        const wallet = await getWalletByUserId(id_user);

        res.status(200).json({
            message: "Wallet retrieved successfully",
            wallet
        });

    } catch (error) {
        console.error("GET WALLET ERROR:", error);

        res.status(404).json({
            message: "Failed to retrieve wallet",
            error: error.message
        });
    }
};


/*
    GET /api/wallet/transactions

    Get the authenticated user's wallet transactions.
*/
const getWalletTransactionsController = async (req, res) => {
    try {
        const id_user = req.user.id_user;

        const transactions = await getWalletTransactions(id_user);

        res.status(200).json({
            message: "Wallet transactions retrieved successfully",
            transactions
        });

    } catch (error) {
        console.error("GET WALLET TRANSACTIONS ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve wallet transactions",
            error: error.message
        });
    }
};


/*
    POST /api/wallet

    Create a wallet for the authenticated user.
*/
const createWalletController = async (req, res) => {
    try {
        const id_user = req.user.id_user;

        const wallet = await createWallet(id_user);

        res.status(201).json({
            message: "Wallet created successfully",
            wallet
        });

    } catch (error) {
        console.error("CREATE WALLET ERROR:", error);

        res.status(400).json({
            message: "Failed to create wallet",
            error: error.message
        });
    }
};

const withdrawController = async (req, res) => {
    try {
        const { amount } = req.body;
        const id_user = req.user.id_user;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than zero"
            });
        }

        const result = await withdrawFromWallet({
            id_user,
            amount
        });

        res.status(200).json({
            message: "Withdrawal processed successfully",
            withdrawal: result
        });

    } catch (error) {
        console.error("WITHDRAWAL ERROR:", error);

        res.status(400).json({
            message: "Failed to process withdrawal",
            error: error.message
        });
    }
};


module.exports = {
    getWalletController,
    getWalletTransactionsController,
    createWalletController,
    withdrawController
};