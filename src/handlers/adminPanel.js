import { Markup } from "telegraf";

export async function showAdminMenu(ctx) {
  await ctx.reply(
    "🔧 Админ‑панель:\nВыбери действие:",
    Markup.inlineKeyboard([
      [Markup.button.callback("➕ Добавить ставку", "add_bet")],
      [Markup.button.callback("📌 Активные ставки", "live_bets")],
      [Markup.button.callback("📚 Все ставки", "all_bets")],
      [Markup.button.callback("📊 Статистика", "stats")]
    ])
  );
}

export async function listAllBets(ctx, db) {
  const chatId = ctx.chat.id;

  try {
    const snap = await db
      .collection("bets")
      .orderBy("created_at", "desc")
      .get();

    if (snap.empty) {
      return ctx.reply("Ставок пока нет.");
    }

    for (const doc of snap.docs) {
      const bet = doc.data();
      const betId = doc.id;

      const statusText =
        bet.status === "active" ? "🟢 Активна" : "🔴 Закрыта";
      const resultText =
        bet.result === "win"
          ? "✅ Выигрыш"
          : bet.result === "lose"
          ? "❌ Проигрыш"
          : "—";

      const created = new Date(bet.created_at).toLocaleString("ru-RU");
      const closed = bet.closed_at
        ? new Date(bet.closed_at).toLocaleString("ru-RU")
        : "—";

      const caption =
        `📌 Ставка:\n${bet.text || "(без текста)"}\n\n` +
        `ID: ${betId}\n` +
        `Статус: ${statusText}\n` +
        `Результат: ${resultText}\n` +
        `Создана: ${created}\n` +
        `Закрыта: ${closed}`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✏️ Редактировать текст", callback_data: `edit_${betId}` }],
            [{ text: "🖼 Заменить фото", callback_data: `photo_${betId}` }],
            [{ text: "❌ Закрыть ставку", callback_data: `close_${betId}` }],
            [{ text: "🗑 Удалить ставку", callback_data: `delete_${betId}` }]
          ]
        }
      };

      if (bet.photoId) {
        await ctx.replyWithPhoto(bet.photoId, {
          caption,
          ...keyboard
        });
      } else {
        await ctx.reply(caption, keyboard);
      }
    }
  } catch (error) {
    console.error("Ошибка при получении всех ставок:", error);
    await ctx.reply("Не удалось загрузить список ставок. Попробуй позже.");
  }
}
