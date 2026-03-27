import { Env } from "../lib/types";
import { badRequest, conflict, json } from "../lib/auth";
import { createOrder } from "../lib/db";
import { validateBotToken } from "../lib/telegram";

interface OrderRequest {
  tier: number;
  display_name: string;
  telegram_user_id: string;
  email: string;
  bot_token: string;
}

export async function handleCreateOrder(request: Request, env: Env): Promise<Response> {
  let body: OrderRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Validate required fields
  const required = ["tier", "display_name", "telegram_user_id", "email", "bot_token"] as const;
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return badRequest(`Missing required field: ${field}`);
    }
  }

  if (![1, 2, 3].includes(body.tier)) {
    return badRequest("tier must be 1, 2, or 3");
  }

  // Validate bot token via Telegram API
  const botInfo = await validateBotToken(body.bot_token);
  if (!botInfo) {
    return badRequest("Invalid bot token — could not verify via Telegram API");
  }

  // Create order (D1 unique constraint on bot_token catches duplicates)
  try {
    const order = await createOrder(env.DB, {
      tier: body.tier,
      display_name: body.display_name,
      telegram_user_id: body.telegram_user_id,
      email: body.email,
      bot_token: body.bot_token,
      bot_username: botInfo.username,
    });

    return json({ order: { id: order.id, status: order.status, bot_username: order.bot_username, tier: order.tier } }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE constraint")) {
      return conflict("This bot token is already associated with an existing order");
    }
    throw err;
  }
}
