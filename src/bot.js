import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { db } from "./firebase.js";
import { addBet } from "./handlers/addBet.js";
import { listBets } from "./handlers/listBets.js";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);

const session = new Map();

function getSession(userId) {
  if (!session.has(userId)) session.set(userId, {});
  return session.get(userId);
}

function clearSession(userId) {
  session.delete(userId);
}

const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("➕ Добавить ставку", "add_bet")],
  [Markup.button.callback("📌 Актуальные ставки", "live_bets")],
  [Markup.button.callback("📊 Статистика", "stats")]
]);

bot.start((ctx) => {
  ctx.reply("Привет! Выбери действие:", mainKeyboard);
});

bot.action("add_bet", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("Недостаточно прав.");
  }

  const s = getSession(ctx.from.id);
  s.mode = "adding_bet";

  await ctx.reply("Отправь текст или фото ставки одним сообщением.");
});

bot.action("live_bets", async (ctx) => {
  await listBets(ctx, db);
});

bot.on("text", async (ctx) => {
  const s = getSession(ctx.from.id);

  if (s.mode === "adding_bet") {
    await addBet(ctx, db, session);
    return;
  }

  await ctx.reply("Выбери действие:", mainKeyboard);
});

bot.on("photo", async (ctx) => {
  const s = getSession(ctx.from.id);

  if (s.mode === "adding_bet") {
    await addBet(ctx, db, session);
    return;
  }

  await ctx.reply("Выбери действие:", mainKeyboard);
});


// ------------------------------------------------------
// 🔥 ОБРАБОТКА ЗАКРЫТИЯ СТАВКИ
// ------------------------------------------------------

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  // --- 1. Нажали "Закрыть ставку"
  if (data.startsWith("close_")) {
    const betId = data.replace("close_", "");

    await ctx.reply(
      "Выберите результат:",
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Выигрыш", `win_${betId}`)],
        [Markup.button.callback("❌ Проигрыш", `lose_${betId}`)]
      ])
    );
  }

  // --- 2. Выбрали "Выигрыш"
  if (data.startsWith("win_")) {
    const betId = data.replace("win_", "");

    await db.collection("bets").doc(betId).update({
      status: "closed",
      result: "win",
      closed_at: Date.now()
    });

    await ctx.reply("Ставка закрыта как: ✅ Выигрыш");
  }

  // --- 3. Выбрали "Проигрыш"
  if (data.startsWith("lose_")) {
    const betId = data.replace("lose_", "");

    await db.collection("bets").doc(betId).update({
      status: "closed",
      result: "lose",
      closed_at: Date.now()
    });

    await ctx.reply("Ставка закрыта как: ❌ Проигрыш");
  }

  // --- 4. Статистика
  if (data === "stats") {
    const wins = await db.collection("bets").where("result", "==", "win").get();
    const loses = await db.collection("bets").where("result", "==", "lose").get();

    const total = wins.size + loses.size;
    const percent = total > 0 ? Math.round((wins.size / total) * 100) : 0;

    await ctx.reply(
      `📊 Статистика:\n\n` +
      `Выигрышей: ${wins.size}\n` +
      `Проигрышей: ${loses.size}\n` +
      `Процент: ${percent}%`
    );
  }
});

bot.launch();
console.log("Бот запущен!");


