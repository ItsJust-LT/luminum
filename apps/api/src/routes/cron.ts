import { Router, Request, Response } from "express";
import { runEmailDnsVerification } from "../lib/cron-verify-email-dns.js";

const router = Router();

function cronSecretAuth(req: Request, res: Response, next: () => void) {
  const secret = process.env.CRON_SECRET || "";
  const provided =
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "").trim() ||
    (req.headers["x-cron-secret"] as string)?.trim() ||
    "";
  if (!secret || provided !== secret) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/verify-email-dns", cronSecretAuth, async (_req: Request, res: Response) => {
  try {
    const result = await runEmailDnsVerification();
    res.json({
      success: true,
      checked: result.checked,
      disabled: result.disabled,
      errors: result.errors,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

export { router as cronRouter };
