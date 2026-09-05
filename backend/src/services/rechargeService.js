const { getPool, sql } = require("../config/db");


/*
    Create a recharge request.

    The request starts as "pending".
    The wallet is NOT changed at this stage.
*/
const createRechargeRequest = async ({
    id_user,
    amount,
    transaction_reference
}) => {

    if (!amount || Number(amount) <= 0) {
        throw new Error("Recharge amount must be greater than zero");
    }

    const pool = getPool();

    /*
        Find the user's wallet.
    */
    const walletResult = await pool
        .request()
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                id_wallet,
                balance
            FROM WALLET
            WHERE id_user = @id_user
        `);

    if (walletResult.recordset.length === 0) {
        throw new Error("Wallet not found");
    }

    const id_wallet = walletResult.recordset[0].id_wallet;

    /*
        Create the recharge request.
    */
    const result = await pool
        .request()
        .input("amount", amount)
        .input("transaction_reference", transaction_reference ?? null)
        .input("id_wallet", id_wallet)
        .query(`
            INSERT INTO RECHARGE_REQUEST
            (
                amount,
                transaction_reference,
                status_recharge,
                id_wallet
            )
            VALUES
            (
                @amount,
                @transaction_reference,
                'pending',
                @id_wallet
            );

            SELECT
                id_request_recharge,
                amount,
                transaction_reference,
                status_recharge,
                creation_date_recharge,
                id_wallet,
                id_admin_check
            FROM RECHARGE_REQUEST
            WHERE id_request_recharge = SCOPE_IDENTITY();
        `);

    return result.recordset[0];
};


/*
    Get a recharge request.
*/
const getRechargeRequest = async ({
    id_request_recharge,
    id_user
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_request_recharge", sql.Int, id_request_recharge)
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                rr.id_request_recharge,
                rr.amount,
                rr.transaction_reference,
                rr.status_recharge,
                rr.creation_date_recharge,
                rr.id_wallet,
                rr.id_admin_check
            FROM RECHARGE_REQUEST rr
            INNER JOIN WALLET w
                ON rr.id_wallet = w.id_wallet
            WHERE rr.id_request_recharge = @id_request_recharge
              AND w.id_user = @id_user
        `);

    if (result.recordset.length === 0) {
        throw new Error("Recharge request not found");
    }

    return result.recordset[0];
};


/*
    Get all recharge requests belonging to the authenticated user.
*/
const getMyRechargeRequests = async (id_user) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                rr.id_request_recharge,
                rr.amount,
                rr.transaction_reference,
                rr.status_recharge,
                rr.creation_date_recharge,
                rr.id_wallet,
                rr.id_admin_check
            FROM RECHARGE_REQUEST rr
            INNER JOIN WALLET w
                ON rr.id_wallet = w.id_wallet
            WHERE w.id_user = @id_user
            ORDER BY rr.creation_date_recharge DESC
        `);

    return result.recordset;
};


/*
    Approve a successful recharge.

    IMPORTANT:
    This function should ONLY be called after
    Algerie Poste has confirmed that the payment succeeded.

    Everything happens inside ONE SQL transaction:
        1. Lock the recharge request.
        2. Verify it is still pending.
        3. Increase wallet balance.
        4. Create wallet transaction.
        5. Mark recharge as approved.
*/
const approveRecharge = async ({
    id_request_recharge
}) => {

    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {

        await transaction.begin();

        /*
            Lock the recharge request.
            This prevents the same successful payment
            from being processed twice simultaneously.
        */
        const rechargeResult = await new sql.Request(transaction)
            .input(
                "id_request_recharge",
                sql.Int,
                id_request_recharge
            )
            .query(`
                SELECT
                    rr.id_request_recharge,
                    rr.amount,
                    rr.status_recharge,
                    rr.id_wallet,
                    w.balance
                FROM RECHARGE_REQUEST rr WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN WALLET w
                    ON rr.id_wallet = w.id_wallet
                WHERE rr.id_request_recharge = @id_request_recharge
            `);

        if (rechargeResult.recordset.length === 0) {
            throw new Error("Recharge request not found");
        }

        const recharge = rechargeResult.recordset[0];

        /*
            Idempotency protection.

            If the provider sends the same success
            notification twice, we do NOT credit
            the wallet twice.
        */
        if (recharge.status_recharge === "approved") {
            throw new Error("Recharge request has already been approved");
        }

        if (recharge.status_recharge !== "pending") {
            throw new Error("Recharge request is no longer pending");
        }

        const newBalance =
            Number(recharge.balance) + Number(recharge.amount);

        /*
            Update wallet.
        */
        await new sql.Request(transaction)
            .input("id_wallet", sql.Int, recharge.id_wallet)
            .input("new_balance", newBalance)
            .query(`
                UPDATE WALLET
                SET balance = @new_balance
                WHERE id_wallet = @id_wallet
            `);

        /*
            Record the recharge in wallet history.
        */
        await new sql.Request(transaction)
            .input("amount", recharge.amount)
            .input("balance_after", newBalance)
            .input("id_wallet", sql.Int, recharge.id_wallet)
            .query(`
                INSERT INTO WALLET_TRANSACTION
                (
                    type,
                    amount,
                    balance_after,
                    transaction_reason,
                    id_wallet
                )
                VALUES
                (
                    'credit',
                    @amount,
                    @balance_after,
                    'recharge',
                    @id_wallet
                )
            `);

        /*
            Mark recharge as approved.
        */
        await new sql.Request(transaction)
            .input(
                "id_request_recharge",
                sql.Int,
                id_request_recharge
            )
            .query(`
                UPDATE RECHARGE_REQUEST
                SET status_recharge = 'approved'
                WHERE id_request_recharge = @id_request_recharge
            `);

        await transaction.commit();

        return {
            id_request_recharge: recharge.id_request_recharge,
            amount: recharge.amount,
            new_balance: newBalance,
            status_recharge: "approved"
        };

    } catch (error) {

        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error(
                "RECHARGE ROLLBACK ERROR:",
                rollbackError
            );
        }

        throw error;
    }
};


/*
    Reject a recharge.

    This should be called when Algerie Poste
    confirms that the payment failed.
*/
const rejectRecharge = async ({
    id_request_recharge
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input(
            "id_request_recharge",
            sql.Int,
            id_request_recharge
        )
        .query(`
            UPDATE RECHARGE_REQUEST
            SET status_recharge = 'rejected'
            WHERE id_request_recharge = @id_request_recharge
              AND status_recharge = 'pending';

            SELECT
                id_request_recharge,
                amount,
                transaction_reference,
                status_recharge,
                creation_date_recharge,
                id_wallet,
                id_admin_check
            FROM RECHARGE_REQUEST
            WHERE id_request_recharge = @id_request_recharge;
        `);

    if (result.recordset.length === 0) {
        throw new Error("Recharge request not found");
    }

    const request = result.recordset[0];

    if (request.status_recharge !== "rejected") {
        throw new Error(
            "Recharge request is no longer pending"
        );
    }

    return request;
};


module.exports = {
    createRechargeRequest,
    getRechargeRequest,
    getMyRechargeRequests,
    approveRecharge,
    rejectRecharge
};