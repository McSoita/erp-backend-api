const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { query, withTransaction } = require("../config/db");
const { normalizeRoleName, resolveRoleId } = require("../utils/roleCatalog");

const SALT_ROUNDS = 10;
const LEAVE_STATUSES = new Set(["Pending", "Approved", "Rejected"]);
const JOB_STATUSES = new Set(["Draft", "Open", "Closed", "On Hold"]);
const APPLICANT_STAGES = new Set([
  "Applied",
  "Screening",
  "Interviewing",
  "Offered",
  "Hired",
  "Rejected",
]);
const TRAINING_STATUSES = new Set([
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
]);
const PAYROLL_RUN_STATUSES = new Set([
  "Draft",
  "In Progress",
  "Completed",
  "Cancelled",
]);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeMoney(value, fieldName) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw createHttpError(400, `Invalid ${fieldName} amount`);
  }

  return Number(amount.toFixed(2));
}

function normalizeInteger(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw createHttpError(400, `${fieldName} must be a valid positive integer`);
  }

  return parsedValue;
}

function normalizeRequiredText(value, fieldName) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw createHttpError(400, `${fieldName} is required`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || null;
}

function normalizeEnum(value, allowedValues, fieldName) {
  const normalizedValue = String(value ?? "").trim();

  if (!allowedValues.has(normalizedValue)) {
    throw createHttpError(
      400,
      `${fieldName} must be one of: ${Array.from(allowedValues).join(", ")}`
    );
  }

  return normalizedValue;
}

async function registerEmployee(data) {
  return withTransaction(async (client) => {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const roleId = await resolveRoleId(client, data.role ?? data.role_id);

    const userResult = await client.query(
      `
        INSERT INTO users (
          username,
          password_hash,
          email,
          role_id,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, role_id, is_active, created_at
      `,
      [
        data.username,
        passwordHash,
        data.email,
        roleId,
        data.is_active ?? true,
      ]
    );

    const user = userResult.rows[0];

    const employeeResult = await client.query(
      `
        INSERT INTO employees (
          user_id,
          first_name,
          last_name,
          department_id,
          job_title,
          hire_date,
          base_salary
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        user.id,
        data.first_name,
        data.last_name,
        data.department_id || null,
        data.job_title || null,
        data.hire_date,
        data.base_salary || null,
      ]
    );

    return {
      user,
      employee: employeeResult.rows[0],
    };
  });
}

async function login(username, password) {
  const result = await query(
    `
      SELECT
        u.id,
        u.username,
        u.password_hash,
        u.email,
        u.role_id,
        u.is_active,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE username = $1
    `,
    [username]
  );

  const user = result.rows[0];

  if (!user) {
    throw createHttpError(401, "Invalid username or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw createHttpError(401, "Invalid username or password");
  }

  if (user.is_active !== true) {
    throw createHttpError(403, "User account is inactive");
  }

  if (!process.env.JWT_SECRET) {
    throw createHttpError(500, "JWT_SECRET is not configured");
  }

  const normalizedRole = normalizeRoleName(user.role_name) ?? user.role_name ?? null;

  const token = jwt.sign(
    {
      user_id: user.id,
      role_id: user.role_id,
      role: normalizedRole,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role: normalizedRole,
      role_name: user.role_name ?? null,
      is_active: user.is_active,
    },
  };
}

async function getEmployees() {
  const result = await query(
    `
      SELECT
        e.id,
        e.user_id,
        e.first_name,
        e.last_name,
        e.job_title,
        e.hire_date,
        e.base_salary,
        e.created_at,
        e.updated_at,
        d.id AS department_id,
        d.name AS department_name,
        u.username,
        u.email,
        u.role_id,
        u.is_active
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN users u ON u.id = e.user_id
      ORDER BY e.id ASC
    `
  );

  return result.rows;
}

async function updateEmployeeStatus(employeeId, data) {
  const normalizedEmployeeId = normalizeInteger(employeeId, "employee id");

  if (typeof data.is_active !== "boolean") {
    throw createHttpError(400, "is_active must be true or false");
  }

  const updateResult = await query(
    `
      UPDATE users u
      SET is_active = $2,
          updated_at = CURRENT_TIMESTAMP
      FROM employees e
      WHERE e.id = $1
        AND u.id = e.user_id
      RETURNING u.id AS user_id
    `,
    [normalizedEmployeeId, data.is_active]
  );

  if (updateResult.rowCount === 0) {
    throw createHttpError(404, "Employee not found");
  }

  const employeeResult = await query(
    `
      SELECT
        e.id,
        e.user_id,
        e.first_name,
        e.last_name,
        e.job_title,
        e.hire_date,
        e.base_salary,
        e.created_at,
        e.updated_at,
        d.id AS department_id,
        d.name AS department_name,
        u.username,
        u.email,
        u.role_id,
        u.is_active
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.id = $1
    `,
    [normalizedEmployeeId]
  );

  return employeeResult.rows[0];
}

async function getLeaveRequests() {
  const result = await query(
    `
      SELECT
        lr.*,
        u.first_name,
        u.last_name
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      ORDER BY lr.created_at DESC
    `
  );

  return result.rows;
}

async function updateLeaveRequestStatus(leaveRequestId, data) {
  const normalizedLeaveRequestId = normalizeInteger(leaveRequestId, "leave request id");
  const status = normalizeEnum(data.status, LEAVE_STATUSES, "status");

  const result = await query(
    `
      UPDATE leave_requests
      SET status = $2
      WHERE id = $1
      RETURNING *
    `,
    [normalizedLeaveRequestId, status]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Leave request not found");
  }

  const leaveResult = await query(
    `
      SELECT
        lr.*,
        u.first_name,
        u.last_name
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      WHERE lr.id = $1
    `,
    [normalizedLeaveRequestId]
  );

  return leaveResult.rows[0];
}

async function getPayrollRuns() {
  const result = await query(
    `
      SELECT *
      FROM payroll_runs
      ORDER BY id DESC
    `
  );

  return result.rows;
}

async function getPerformanceReviews() {
  const result = await query(
    `
      SELECT
        pr.*,
        employee.first_name,
        employee.last_name,
        reviewer.first_name AS reviewer_first_name,
        reviewer.last_name AS reviewer_last_name
      FROM performance_reviews pr
      JOIN users employee ON pr.employee_id = employee.id
      LEFT JOIN users reviewer ON pr.reviewer_id = reviewer.id
      ORDER BY pr.review_date DESC
    `
  );

  return result.rows;
}

async function updatePayrollRunStatus(payrollRunId, data) {
  const normalizedPayrollRunId = normalizeInteger(payrollRunId, "payroll run id");
  const status = normalizeEnum(data.status, PAYROLL_RUN_STATUSES, "status");

  const result = await query(
    `
      UPDATE payroll_runs
      SET status = $2
      WHERE id = $1
      RETURNING *
    `,
    [normalizedPayrollRunId, status]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Payroll run not found");
  }

  return result.rows[0];
}

async function updatePerformanceReview(reviewId, data) {
  const normalizedReviewId = normalizeInteger(reviewId, "performance review id");
  const rating = Number(data.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, "rating must be an integer between 1 and 5");
  }

  const reviewDate = data.review_date || null;

  if (!reviewDate) {
    throw createHttpError(400, "review_date is required");
  }

  const result = await query(
    `
      UPDATE performance_reviews
      SET
        review_date = $2,
        rating = $3,
        comments = $4
      WHERE id = $1
      RETURNING *
    `,
    [
      normalizedReviewId,
      reviewDate,
      rating,
      String(data.comments ?? "").trim() || null,
    ]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Performance review not found");
  }

  const reviewResult = await query(
    `
      SELECT
        pr.*,
        employee.first_name,
        employee.last_name,
        reviewer.first_name AS reviewer_first_name,
        reviewer.last_name AS reviewer_last_name
      FROM performance_reviews pr
      JOIN users employee ON pr.employee_id = employee.id
      LEFT JOIN users reviewer ON pr.reviewer_id = reviewer.id
      WHERE pr.id = $1
    `,
    [normalizedReviewId]
  );

  return reviewResult.rows[0];
}

async function getJobPostings() {
  const result = await query(
    `
      SELECT *
      FROM job_postings
      ORDER BY posted_date DESC, id DESC
    `
  );

  return result.rows;
}

async function createJobPosting(data) {
  const result = await query(
    `
      INSERT INTO job_postings (
        title,
        department,
        employment_type,
        status,
        posted_date
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      normalizeRequiredText(data.title, "title"),
      normalizeRequiredText(data.department, "department"),
      normalizeRequiredText(data.employment_type || "Full-Time", "employment_type"),
      normalizeEnum(data.status || "Open", JOB_STATUSES, "status"),
      data.posted_date || new Date().toISOString().slice(0, 10),
    ]
  );

  return result.rows[0];
}

async function updateJobPostingStatus(jobPostingId, data) {
  const normalizedJobPostingId = normalizeInteger(jobPostingId, "job posting id");
  const status = normalizeEnum(data.status, JOB_STATUSES, "status");

  const result = await query(
    `
      UPDATE job_postings
      SET status = $2
      WHERE id = $1
      RETURNING *
    `,
    [normalizedJobPostingId, status]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Job posting not found");
  }

  return result.rows[0];
}

async function getApplicants() {
  const result = await query(
    `
      SELECT
        a.*,
        j.title AS job_title
      FROM applicants a
      JOIN job_postings j ON a.job_posting_id = j.id
      ORDER BY a.application_date DESC
    `
  );

  return result.rows;
}

async function createApplicant(data) {
  const jobPostingId = normalizeInteger(data.job_posting_id, "job_posting_id");

  const result = await query(
    `
      INSERT INTO applicants (
        job_posting_id,
        first_name,
        last_name,
        email,
        pipeline_stage,
        application_date
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      jobPostingId,
      normalizeRequiredText(data.first_name, "first_name"),
      normalizeRequiredText(data.last_name, "last_name"),
      normalizeRequiredText(data.email, "email"),
      normalizeEnum(data.pipeline_stage || "Applied", APPLICANT_STAGES, "pipeline_stage"),
      data.application_date || new Date().toISOString().slice(0, 10),
    ]
  );

  const applicantResult = await query(
    `
      SELECT
        a.*,
        j.title AS job_title
      FROM applicants a
      JOIN job_postings j ON a.job_posting_id = j.id
      WHERE a.id = $1
    `,
    [result.rows[0].id]
  );

  return applicantResult.rows[0];
}

async function updateApplicantStage(applicantId, data) {
  const normalizedApplicantId = normalizeInteger(applicantId, "applicant id");
  const pipelineStage = normalizeEnum(
    data.pipeline_stage,
    APPLICANT_STAGES,
    "pipeline_stage"
  );

  const result = await query(
    `
      UPDATE applicants
      SET pipeline_stage = $2
      WHERE id = $1
      RETURNING *
    `,
    [normalizedApplicantId, pipelineStage]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Applicant not found");
  }

  const applicantResult = await query(
    `
      SELECT
        a.*,
        j.title AS job_title
      FROM applicants a
      JOIN job_postings j ON a.job_posting_id = j.id
      WHERE a.id = $1
    `,
    [normalizedApplicantId]
  );

  return applicantResult.rows[0];
}

async function getTrainingPrograms() {
  const result = await query(
    `
      SELECT *
      FROM training_programs
      ORDER BY scheduled_date ASC, id DESC
    `
  );

  return result.rows;
}

async function createTrainingProgram(data) {
  const result = await query(
    `
      INSERT INTO training_programs (
        title,
        description,
        trainer_name,
        scheduled_date
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [
      String(data.title ?? "").trim(),
      String(data.description ?? "").trim() || null,
      String(data.trainer_name ?? "").trim() || null,
      data.scheduled_date,
    ]
  );

  return result.rows[0];
}

async function updateTrainingProgramStatus(trainingProgramId, data) {
  const normalizedTrainingProgramId = normalizeInteger(
    trainingProgramId,
    "training program id"
  );
  const status = normalizeEnum(data.status, TRAINING_STATUSES, "status");

  const result = await query(
    `
      UPDATE training_programs
      SET status = $2
      WHERE id = $1
      RETURNING *
    `,
    [normalizedTrainingProgramId, status]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Training program not found");
  }

  return result.rows[0];
}

async function createPayrollRun(data) {
  if (!data.pay_period || !String(data.pay_period).trim()) {
    throw createHttpError(400, "pay_period is required");
  }

  const result = await query(
    `
      INSERT INTO payroll_runs (
        pay_period,
        run_date,
        status,
        total_gross,
        total_taxes,
        total_net
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      String(data.pay_period).trim(),
      new Date().toISOString().slice(0, 10),
      "Draft",
      normalizeMoney(data.total_gross, "total_gross"),
      normalizeMoney(data.total_taxes, "total_taxes"),
      normalizeMoney(data.total_net, "total_net"),
    ]
  );

  return result.rows[0];
}

async function createPerformanceReview(data) {
  const employeeId = Number(data.employee_id);
  const reviewerId = Number(data.reviewer_id);
  const rating = Number(data.rating);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    throw createHttpError(400, "employee_id must be a valid user id");
  }

  if (!Number.isInteger(reviewerId) || reviewerId <= 0) {
    throw createHttpError(400, "reviewer_id is required");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, "rating must be an integer between 1 and 5");
  }

  const result = await query(
    `
      INSERT INTO performance_reviews (
        employee_id,
        reviewer_id,
        review_date,
        rating,
        comments
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      employeeId,
      reviewerId,
      new Date().toISOString().slice(0, 10),
      rating,
      String(data.comments ?? "").trim() || null,
    ]
  );

  return result.rows[0];
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
