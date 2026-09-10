const express = require("express");

const {
    createEvaluationController,
    updateEvaluationController,
    getUserEvaluationSummaryController,
    getUserEvaluationsController,
    getRideEvaluationsController
} = require("../controllers/evaluationController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/",
    authenticateToken,
    createEvaluationController
);

router.put(
    "/:id",
    authenticateToken,
    updateEvaluationController
);

router.get(
    "/users/:id/summary",
    getUserEvaluationSummaryController
);

router.get(
    "/users/:id",
    getUserEvaluationsController
);

router.get(
    "/rides/:id",
    getRideEvaluationsController
);

module.exports = router;