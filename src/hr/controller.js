const hrService = require("./service");

function handleError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error.code === "23503") {
    return res.status(400).json({
      message: "Invalid role or department reference",
    });
  }

  if (error.code === "23505") {
    return res.status(409).json({
      message: "Username or email already exists",
    });
  }

  if (error.code === "22P02" || error.code === "23514") {
    return res.status(400).json({
      message: "HR request failed database validation",
    });
  }

  return res.status(500).json({
    message: error.message || "Internal server error",
  });
}

async function registerEmployee(req, res) {
  try {
    const result = await hrService.registerEmployee(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function login(req, res) {
  try {
    const result = await hrService.login(req.body.username, req.body.password);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getEmployees(req, res) {
  try {
    const result = await hrService.getEmployees();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateEmployeeStatus(req, res) {
  try {
    const result = await hrService.updateEmployeeStatus(req.params.id, req.body);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getLeaveRequests(req, res) {
  try {
    const result = await hrService.getLeaveRequests();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateLeaveRequestStatus(req, res) {
  try {
    const result = await hrService.updateLeaveRequestStatus(req.params.id, req.body);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getPayrollRuns(req, res) {
  try {
    const result = await hrService.getPayrollRuns();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getPerformanceReviews(req, res) {
  try {
    const result = await hrService.getPerformanceReviews();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updatePayrollRunStatus(req, res) {
  try {
    const result = await hrService.updatePayrollRunStatus(req.params.id, req.body);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updatePerformanceReview(req, res) {
  try {
    const result = await hrService.updatePerformanceReview(req.params.id, req.body);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getJobPostings(req, res) {
  try {
    const result = await hrService.getJobPostings();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createJobPosting(req, res) {
  try {
    const result = await hrService.createJobPosting(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateJobPostingStatus(req, res) {
  try {
    const result = await hrService.updateJobPostingStatus(req.params.id, req.body);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getApplicants(req, res) {
  try {
    const result = await hrService.getApplicants();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createApplicant(req, res) {
  try {
    const result = await hrService.createApplicant(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateApplicantStage(req, res) {
  try {
    const result = await hrService.updateApplicantStage(req.params.id, req.body);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getTrainingPrograms(req, res) {
  try {
    const result = await hrService.getTrainingPrograms();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createTrainingProgram(req, res) {
  try {
    const result = await hrService.createTrainingProgram(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateTrainingProgramStatus(req, res) {
  try {
    const result = await hrService.updateTrainingProgramStatus(req.params.id, req.body);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createPayrollRun(req, res) {
  try {
    const result = await hrService.createPayrollRun(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createPerformanceReview(req, res) {
  try {
    const result = await hrService.createPerformanceReview({
      ...req.body,
      reviewer_id: req.user?.user_id,
    });

    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  registerEmployee,
  login,
  getEmployees,
  updateEmployeeStatus,
  getLeaveRequests,
  updateLeaveRequestStatus,
  getPayrollRuns,
  updatePayrollRunStatus,
  getPerformanceReviews,
  updatePerformanceReview,
  getJobPostings,
  createJobPosting,
  updateJobPostingStatus,
  getApplicants,
  createApplicant,
  updateApplicantStage,
  getTrainingPrograms,
  createTrainingProgram,
  updateTrainingProgramStatus,
  createPayrollRun,
  createPerformanceReview,
};
