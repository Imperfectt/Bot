export async function listBets(ctx, db) {
  const snap = await db
    .collection("bets")
    .where("status", "==", "active")
    .orderBy("created_at", "desc")
    .get();

  if (snap.empty) {
    return ctx.reply("Сейчас нет активных ставок.");
  }

  let msg = "📌 Актуальные ставки:\n\n";

  snap.forEach((doc) => {
    const b = doc.data();
    msg += `• ${b.text}\nID: ${doc.id}\n\n`;
  });

  await ctx.reply(msg);
}
