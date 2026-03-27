interface GetMeResponse {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
  description?: string;
}

export interface BotInfo {
  bot_id: number;
  username: string;
  first_name: string;
}

export async function validateBotToken(token: string): Promise<BotInfo | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data: GetMeResponse = await res.json();
    if (!data.ok || !data.result?.is_bot || !data.result.username) {
      return null;
    }

    return {
      bot_id: data.result.id,
      username: data.result.username,
      first_name: data.result.first_name,
    };
  } catch {
    return null;
  }
}
