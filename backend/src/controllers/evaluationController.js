const {
    createEvaluation,
    updateEvaluation,
    getUserEvaluationSummary,
    getUserEvaluations,
    getRideEvaluations
} = require("../services/evaluationService");

const createEvaluationController = async (req, res) => {
    try {
        const id_evaluator = req.user.id_user;
        const { id_ride, id_evaluated, stars, comment } = req.body;

        const evaluation = await createEvaluation({
            id_evaluator,
            id_evaluated,
            id_ride,
            stars,
            comment
        });

        res.status(201).json({
            message: "Evaluation created successfully",
            evaluation
        });
    } catch (error) {
        console.error("Create evaluation error:", error);
        res.status(400).json({
            message: error.message
        });
    }
};

const updateEvaluationController = async (req, res) => {
    try {
        const id_evaluation = Number(req.params.id);
        const id_evaluator = req.user.id_user;
        const { stars, comment } = req.body;

        const evaluation = await updateEvaluation({
            id_evaluation,
            id_evaluator,
            stars,
            comment
        });

        res.status(200).json({
            message: "Evaluation updated successfully",
            evaluation
        });
    } catch (error) {
        console.error("Update evaluation error:", error);
        res.status(400).json({
            message: error.message
        });
    }
};

const getUserEvaluationSummaryController = async (req, res) => {
    try {
        const id_user = Number(req.params.id);

        const summary = await getUserEvaluationSummary(id_user);

        res.status(200).json(summary);
    } catch (error) {
        console.error("Get evaluation summary error:", error);
        res.status(400).json({
            message: error.message
        });
    }
};

const getUserEvaluationsController = async (req, res) => {
    try {
        const id_user = Number(req.params.id);

        const evaluations = await getUserEvaluations(id_user);

        res.status(200).json({
            evaluations
        });
    } catch (error) {
        console.error("Get user evaluations error:", error);
        res.status(400).json({
            message: error.message
        });
    }
};

const getRideEvaluationsController = async (req, res) => {
    try {
        const id_ride = Number(req.params.id);

        const evaluations = await getRideEvaluations(id_ride);

        res.status(200).json({
            evaluations
        });
    } catch (error) {
        console.error("Get ride evaluations error:", error);
        res.status(400).json({
            message: error.message
        });
    }
};

module.exports = {
    createEvaluationController,
    updateEvaluationController,
    getUserEvaluationSummaryController,
    getUserEvaluationsController,
    getRideEvaluationsController
};