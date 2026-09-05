const { getPool } = require("../config/db");

const getCurrentTariff = async () => {
    const pool = getPool();

    const result = await pool
        .request()
        .query(`
            SELECT TOP 1
                suggested_price_perKM,
                min_price_perKM,
                max_price_perKM,
                commision_percentage,
                min_balance_toride
            FROM TARIF_CONFIGURATION
            ORDER BY updated_at DESC
        `);

    if (result.recordset.length === 0) {
        throw new Error("Tarif configuration not found");
    }

    return result.recordset[0];
};

const calculateAllowedPriceRange = async (distance) => {
    const tariff = await getCurrentTariff();

    const rideDistance = Number(distance);

    if (!Number.isFinite(rideDistance) || rideDistance <= 0) {
        throw new Error("Distance must be a valid positive number");
    }

    const minPricePerKM = Number(tariff.min_price_perKM);
    const maxPricePerKM = Number(tariff.max_price_perKM);

    if (
        !Number.isFinite(minPricePerKM) ||
        !Number.isFinite(maxPricePerKM) ||
        minPricePerKM <= 0 ||
        maxPricePerKM <= 0 ||
        minPricePerKM > maxPricePerKM
    ) {
        throw new Error("Invalid tariff configuration");
    }

    return {
        minimumPrice: minPricePerKM * rideDistance,
        maximumPrice: maxPricePerKM * rideDistance,
        minPricePerKM,
        maxPricePerKM
    };
};

const validateRidePrice = async ({ distance, price }) => {
    const ridePrice = Number(price);

    if (!Number.isFinite(ridePrice) || ridePrice <= 0) {
        throw new Error("Price must be a valid positive number");
    }

    const range = await calculateAllowedPriceRange(distance);

    if (
        ridePrice < range.minimumPrice ||
        ridePrice > range.maximumPrice
    ) {
        throw new Error(
            `Price must be between ${range.minimumPrice.toFixed(2)} DA and ${range.maximumPrice.toFixed(2)} DA`
        );
    }

    return {
        price: ridePrice,
        ...range
    };
};

module.exports = {
    getCurrentTariff,
    calculateAllowedPriceRange,
    validateRidePrice
};