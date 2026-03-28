import { Env } from "../lib/types";
import { verifyWorkerToken, unauthorized, json } from "../lib/auth";
import { updateHealth, getHealth, markAlerted } from "../lib/db";
import { sendTelegramAlert } from "../lib/alerts";

export async function handleHealthPing(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  await updateHealth(env.DB);
  return json({ ok: true });
}

// Called on every incoming request to check if Pi5 is offline
// This is a lightweight check — reads one row from D1
export async function checkPi5Health(env: Env, ctx: ExecutionContext): Promise<void> {
  const health = await getHealth(env.DB);
  if (!health) return; // No health record yet — Pi5 hasn't pinged yet

  const lastPing = new Date(health.last_ping).getTime();
  const now = Date.now();
  const fifteenMin = 15 * 60 * 1000;

  if (now - lastPing > fifteenMin && !health.alerted) {
    // Pi5 is offline — send alert (non-blocking via waitUntil)
    ctx.waitUntil(
      sendTelegramAlert(
        env.OWNER_TELEGRAM_BOT_TOKEN,
        env.OWNER_TELEGRAM_CHAT_ID,
        "Pi5 offline — no health pings for 15+ minutes. CF Queue is holding orders."
      ).then(() => markAlerted(env.DB))
    );
  }
}
