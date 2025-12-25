export async function addBet(ctx, db, session) {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text?.trim();

    if (!text) {
      return ctx.reply("Текст пустой. Отправь ещё раз.");
    }

    // Создаём объект ставки
    const bet = {
      text,
      status: "active",
      created_at: Date.now()
    };

    // Сохраняем в Firestore
    const docRef = await db.collection("bets").add(bet);

    await ctx.reply(`Ставка добавлена!\nID: ${docRef.id}`);

    // увед подруге
    if (process.env.USER_ID) {
      await ctx.telegram.sendMessage(
        process.env.USER_ID,
        `📢 Новая ставка:\n\n${text}`
      );
    }

    // Чистим сессию
    session.delete(userId);

  } catch (err) {
    console.error("Ошибка при добавлении ставки:", err);
    await ctx.reply("Произошла ошибка при добавлении ставки. Попробуй ещё раз.");
  }
}
