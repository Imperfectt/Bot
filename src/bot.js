import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { db } from "./firebase.js";
import { addBet, handleAddBetText } from "./handlers/addBet.js";
import { listBets } from "./handlers/listBets.js";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);

// Простая сессия
const session = new Map();

function getSession(userId) {
  if (!session.has(userId)) session.set(userId, {});
  return session.get(userId);
}

function clearSession(userId) {
  session.delete(userId);
}

// Клавиатура
const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("➕ Добавить ставку", "add_bet")],
  [Markup.button.callback("📌 Актуальные ставки", "live_bets")]
]);

bot.start((ctx) => {
  ctx.reply("Привет! Выбери действие:", mainKeyboard);
});

// Добавление ставки
bot.action("add_bet", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("Недостаточно прав.");
  }

  const s = getSession(ctx.from.id);
  s.mode = "adding_bet";

  await ctx.reply("Отправь текст ставки одним сообщением.");
});

// Список ставок
bot.action("live_bets", async (ctx) => {
  await listBets(ctx, db);
});

// Обработка текста
bot.on("text", async (ctx) => {
  const s = getSession(ctx.from.id);

  if (s.mode === "adding_bet") {
    await addBet(ctx, db, session);
    return;
  }

  await ctx.reply("Выбери действие:", mainKeyboard);
});

bot.launch();
console.log("Бот запущен!");
