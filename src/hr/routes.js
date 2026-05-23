const express = require("express");

const auth = require("../middleware/auth");
const hrController = require("./controller");
const {
  validateBody,
  registerEmployeeSchema,
  loginSchema,
} = require("./validator");

const router = express.Router();

router.post(
  "/register",
  validateBody(registerEmployeeSchema),
  hrController.registerEmployee
);
router.post("/login", validateBody(loginSchema), hrController.login);
router.get("/employees", auth, hrController.getEmployees);
router.patch("/employees/:id/status", auth, hrController.updateEmployeeStatus);
router.get("/leave", auth, hrController.getLeaveRequests);
router.patch("/leave/:id/status", auth, hrController.updateLeaveRequestStatus);
router.get("/payroll/runs", auth, hrController.getPayrollRuns);
router.post("/payroll/runs", auth, hrController.createPayrollRun);
router.patch("/payroll/runs/:id/status", auth, hrController.updatePayrollRunStatus);
router.get("/performance", auth, hrController.getPerformanceReviews);
router.post("/performance", auth, hrController.createPerformanceReview);
router.patch("/performance/:id", auth, hrController.updatePerformanceReview);
router.get("/recruitment/jobs", auth, hrController.getJobPostings);
router.post("/recruitment/jobs", auth, hrController.createJobPosting);
router.patch(
  "/recruitment/jobs/:id/status",
  auth,
  hrController.updateJobPostingStatus
);
router.get("/recruitment/applicants", auth, hrController.getApplicants);
router.post(
  "/recruitment/applicants",
  auth,
  hrController.createApplicant
);
router.patch(
  "/recruitment/applicants/:id/stage",
  auth,
  hrController.updateApplicantStage
);
router.get("/training", auth, hrController.getTrainingPrograms);
router.post("/training", auth, hrController.createTrainingProgram);
router.patch("/training/:id/status", auth, hrController.updateTrainingProgramStatus);

module.exports = router;
