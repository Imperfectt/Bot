export async function addBet(ctx, db, session) {
  try {
    const userId = ctx.from.id;

    // Текст ставки (если есть)
    const text = ctx.message.text?.trim() || null;

    // Фото (если есть)
    let photoId = null;
    if (ctx.message.photo) {
      // Берём самое большое фото
      photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    }

    // Если нет ни текста, ни фото — ошибка
    if (!text && !photoId) {
      return ctx.reply("Отправь текст или фото ставки.");
    }

    // Создаём объект ставки
    const bet = {
      text: text || "",
      photoId: photoId || null,
      status: "active",
      result: null,
      created_at: Date.now()
    };

    // Сохраняем в Firestore
    const docRef = await db.collection("bets").add(bet);

    await ctx.reply(`Ставка добавлена!\nID: ${docRef.id}`);

    // Уведомление подруге
    if (process.env.USER_ID) {
      if (photoId) {
        await ctx.telegram.sendPhoto(
          process.env.USER_ID,
          photoId,
          { caption: `📢 Новая ставка:\n\n${text || "(без текста)"}` }
        );
      } else {
        await ctx.telegram.sendMessage(
          process.env.USER_ID,
          `📢 Новая ставка:\n\n${text}`
        );
      }
    }

    // Чистим сессию
    session.delete(userId);

  } catch (err) {
    console.error("Ошибка при добавлении ставки:", err);
    await ctx.reply("Произошла ошибка при добавлении ставки. Попробуй ещё раз.");
  }
}
