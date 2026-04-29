import { Router } from "express";
import { authRouter } from "./auth.js";
import { categoriesRouter } from "./categories.js";
import { accountsRouter } from "./accounts.js";
import { transactionsRouter } from "./transactions.js";
import { budgetsRouter } from "./budgets.js";
import { dashboardRouter } from "./dashboard.js";
import { reportsRouter } from "./reports.js";
import { usersRouter } from "./users.js";
import { authenticate } from "../middleware/auth.js";

export const router = Router();

router.use("/auth", authRouter);

// All routes below this line require authentication
router.use(authenticate);

router.use("/users", usersRouter);
router.use("/categories", categoriesRouter);
router.use("/accounts", accountsRouter);
router.use("/transactions", transactionsRouter);
router.use("/budgets", budgetsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportsRouter);
