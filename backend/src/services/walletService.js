const { getPool, sql } = require("../config/db");

/*
    Get the wallet of a user.
*/
const getWalletByUserId = async (id_user) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                id_wallet,
                balance,
                creation_date_w,
                id_user
            FROM WALLET
            WHERE id_user = @id_user
        `);

    if (result.recordset.length === 0) {
        throw new Error("Wallet not found");
    }

    return result.recordset[0];
};


/*
    Get all transactions of a user's wallet.
*/
const getWalletTransactions = async (id_user) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                wt.id_transaction,
                wt.type,
                wt.amount,
                wt.balance_after,
                wt.transaction_reason,
                wt.creation_date_w,
                wt.id_wallet,
                wt.id_ride
            FROM WALLET_TRANSACTION wt
            INNER JOIN WALLET w
                ON wt.id_wallet = w.id_wallet
            WHERE w.id_user = @id_user
            ORDER BY wt.creation_date_w DESC
        `);

    return result.recordset;
};


/*
    Create a wallet for a user.
*/
const createWallet = async (id_user) => {
    const pool = getPool();

    const existingWallet = await pool
        .request()
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                id_wallet,
                balance,
                creation_date_w,
                id_user
            FROM WALLET
            WHERE id_user = @id_user
        `);

    if (existingWallet.recordset.length > 0) {
        throw new Error("User already has a wallet");
    }

    const result = await pool
        .request()
        .input("id_user", sql.Int, id_user)
        .query(`
            INSERT INTO WALLET
            (
                balance,
                id_user
            )
            VALUES
            (
                0,
                @id_user
            );

            SELECT
                id_wallet,
                balance,
                creation_date_w,
                id_user
            FROM WALLET
            WHERE id_wallet = SCOPE_IDENTITY();
        `);

    return result.recordset[0];
};

const withdrawFromWallet = async ({ id_user, amount }) => {
    if (!amount || Number(amount) <= 0) {
        throw new Error("Withdrawal amount must be greater than zero");
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Lock the wallet row while checking/updating the balance
        const walletResult = await new sql.Request(transaction)
            .input("id_user", sql.Int, id_user)
            .query(`
                SELECT id_wallet, balance
                FROM WALLET WITH (UPDLOCK, HOLDLOCK)
                WHERE id_user = @id_user
            `);

        if (walletResult.recordset.length === 0) {
            throw new Error("Wallet not found");
        }

        const wallet = walletResult.recordset[0];
        const currentBalance = Number(wallet.balance);
        const withdrawalAmount = Number(amount);

        if (withdrawalAmount > currentBalance) {
            throw new Error("Insufficient wallet balance");
        }

        const newBalance = currentBalance - withdrawalAmount;

        // Update wallet balance
        await new sql.Request(transaction)
            .input("id_wallet", sql.Int, wallet.id_wallet)
            .input("new_balance", newBalance)
            .query(`
                UPDATE WALLET
                SET balance = @new_balance
                WHERE id_wallet = @id_wallet
            `);

        // Record the withdrawal
       await new sql.Request(transaction)
    .input("type", sql.NVarChar, "debit")
    .input("amount", withdrawalAmount)
    .input("balance_after", newBalance)
    .input("transaction_reason", sql.NVarChar, "withdrawal")
    .input("id_wallet", sql.Int, wallet.id_wallet)
    .query(`
        INSERT INTO WALLET_TRANSACTION
            (type, amount, balance_after, transaction_reason, id_wallet)
        VALUES
            (@type, @amount, @balance_after, @transaction_reason, @id_wallet)
    `);

        await transaction.commit();

        return {
            id_wallet: wallet.id_wallet,
            amount: withdrawalAmount,
            new_balance: newBalance
        };

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error("WITHDRAWAL ROLLBACK ERROR:", rollbackError);
        }

        throw error;
    }
};

const checkMinimumBalance = async (id_user, transaction = null) => {

    const request = transaction
        ? new sql.Request(transaction)
        : getPool().request();

    const walletResult = await request
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                w.balance,
                tc.min_balance_toride
            FROM WALLET w
            CROSS JOIN (
                SELECT TOP 1
                    min_balance_toride
                FROM TARIF_CONFIGURATION
            ) tc
            WHERE w.id_user = @id_user
            ORDER BY updated_at DESC
        `);

    if (walletResult.recordset.length === 0) {
        throw new Error("Wallet not found");
    }

    const balance = Number(walletResult.recordset[0].balance);
    const minimumBalance =
        Number(walletResult.recordset[0].min_balance_toride);

    if (!Number.isFinite(balance)) {
        throw new Error("Invalid wallet balance");
    }

    if (!Number.isFinite(minimumBalance)) {
        throw new Error("Invalid minimum wallet balance configuration");
    }

    if (balance < minimumBalance) {
        throw new Error(
            `Driver must have at least ${minimumBalance} DA in wallet`
        );
    }

    return {
        balance,
        minimumBalance
    };
};
const transferWalletPayment = async ({
    transaction,
    passengerId,
    driverId,
    amount,
    idRide
}) => {
    const passengerWalletResult = await new sql.Request(transaction)
        .input("id_user", sql.Int, passengerId)
        .query(`
            SELECT id_wallet, balance
            FROM WALLET WITH (UPDLOCK, HOLDLOCK)
            WHERE id_user = @id_user
        `);

    if (passengerWalletResult.recordset.length === 0) {
        throw new Error("Passenger wallet not found");
    }

    const passengerWallet = passengerWalletResult.recordset[0];

    const driverWalletResult = await new sql.Request(transaction)
        .input("id_user", sql.Int, driverId)
        .query(`
            SELECT id_wallet, balance
            FROM WALLET WITH (UPDLOCK, HOLDLOCK)
            WHERE id_user = @id_user
        `);

    if (driverWalletResult.recordset.length === 0) {
        throw new Error("Driver wallet not found");
    }

    const driverWallet = driverWalletResult.recordset[0];

    const paymentAmount = Number(amount);
    const passengerBalance = Number(passengerWallet.balance);

    if (paymentAmount <= 0) {
        throw new Error("Invalid payment amount");
    }

    if (passengerBalance < paymentAmount) {
        throw new Error("Insufficient wallet balance");
    }

    const newPassengerBalance = passengerBalance - paymentAmount;
    const newDriverBalance =
        Number(driverWallet.balance) + paymentAmount;

    // Remove money from passenger wallet
    await new sql.Request(transaction)
        .input("id_wallet", sql.Int, passengerWallet.id_wallet)
        .input("amount", sql.Decimal(10, 2), paymentAmount)
        .query(`
            UPDATE WALLET
            SET balance = balance - @amount
            WHERE id_wallet = @id_wallet
        `);

    // Add money to driver wallet
    await new sql.Request(transaction)
        .input("id_wallet", sql.Int, driverWallet.id_wallet)
        .input("amount", sql.Decimal(10, 2), paymentAmount)
        .query(`
            UPDATE WALLET
            SET balance = balance + @amount
            WHERE id_wallet = @id_wallet
        `);

    // Passenger transaction
    await new sql.Request(transaction)
        .input("type", sql.VarChar, "debit")
        .input("amount", sql.Decimal(10, 2), paymentAmount)
        .input("balance_after", sql.Decimal(10, 2), newPassengerBalance)
        .input("transaction_reason", sql.VarChar, "ride_payment")
        .input("id_wallet", sql.Int, passengerWallet.id_wallet)
        .input("id_ride", sql.Int, idRide)
        .query(`
            INSERT INTO WALLET_TRANSACTION
            (
                type,
                amount,
                balance_after,
                transaction_reason,
                id_wallet,
                id_ride
            )
            VALUES
            (
                @type,
                @amount,
                @balance_after,
                @transaction_reason,
                @id_wallet,
                @id_ride
            )
        `);

    // Driver transaction
    await new sql.Request(transaction)
        .input("type", sql.VarChar, "credit")
        .input("amount", sql.Decimal(10, 2), paymentAmount)
        .input("balance_after", sql.Decimal(10, 2), newDriverBalance)
        .input("transaction_reason", sql.VarChar, "ride_payment")
        .input("id_wallet", sql.Int, driverWallet.id_wallet)
        .input("id_ride", sql.Int, idRide)
        .query(`
            INSERT INTO WALLET_TRANSACTION
            (
                type,
                amount,
                balance_after,
                transaction_reason,
                id_wallet,
                id_ride
            )
            VALUES
            (
                @type,
                @amount,
                @balance_after,
                @transaction_reason,
                @id_wallet,
                @id_ride
            )
        `);
};module.exports = {
    getWalletByUserId,
    getWalletTransactions,
    createWallet,
    withdrawFromWallet,
    checkMinimumBalance,
    transferWalletPayment
};