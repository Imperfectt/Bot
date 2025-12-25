export async function addBet(ctx, db, session) {
  const userId = ctx.from.id;
  const text = ctx.message.text?.trim();

  if (!text) {
    return ctx.reply("Текст пустой. Отправь ещё раз.");
  }

  const bet = {
    text,
    status: "active",
    created_at: Date.now()
  };

  const docRef = await db.collection("bets").add(bet);

  await ctx.reply(`Ставка добавлена!\nID: ${docRef.id}`);

  // Уведомление подруге
  await ctx.telegram.sendMessage(
    process.env.USER_ID,
    `📢 Новая ставка:\n\n${text}`
  );

  session.delete(userId);
}
