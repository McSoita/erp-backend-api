require("dotenv").config();

const express = require("express");
const cors = require("cors");
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ['GET', 'POST','PATCH', 'PUT', 'DELETE'],
  credentials: true,
};

const helmet = require("helmet");
const dashboardRoutes = require("./dashboard/routes");
const inventoryRoutes = require("./inventory/routes");
const salesRoutes = require("./sales/routes");
const financeRoutes = require("./finance/routes");
const wmsRoutes = require("./wms/routes");
const hrRoutes = require("./hr/routes");
const scmRoutes = require("./scm/routes");
const crmRoutes = require("./crm/routes");
const biRoutes = require("./bi/routes");
const { ensureRoleCatalog } = require("./utils/roleCatalog");
const { query } = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors(corsOptions));
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/wms", wmsRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/scm", scmRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/bi", biRoutes);

app.get("/", (req, res) => {
  res.json({ message: "ERP API is running" });
});

async function startServer() {
  try {
    await ensureRoleCatalog(query);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize role catalog", error);
    process.exit(1);
  }
}

startServer();
