export async function listBets(ctx, db) {
  const chatId = ctx.chat.id;

  try {
    const snap = await db
      .collection("bets")
      .where("status", "==", "active")
      .orderBy("created_at", "desc")
      .get();

    if (snap.empty) {
      return ctx.reply("Сейчас нет активных ставок.");
    }

    // Перебираем ставки по одной и отправляем каждую отдельно
    for (const doc of snap.docs) {
      const bet = doc.data();
      const betId = doc.id;

      const caption = `📌 Ставка:\n${bet.text || "(без текста)"}\n\nID: ${betId}`;

      // Кнопка "Закрыть ставку"
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Закрыть ставку", callback_data: `close_${betId}` }]
          ]
        }
      };

      // Если есть фото — отправляем фото
      if (bet.photoId) {
        await ctx.replyWithPhoto(bet.photoId, {
          caption,
          ...keyboard
        });
      } else {
        // Если фото нет — отправляем текст
        await ctx.reply(caption, keyboard);
      }
    }

  } catch (error) {
    console.error("Ошибка при получении ставок:", error);
    await ctx.reply("Не удалось загрузить ставки. Попробуй позже.");
  }
}

