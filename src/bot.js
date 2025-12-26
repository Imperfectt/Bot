import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { db } from "./firebase.js";
import { addBet } from "./handlers/addBet.js";
import { listBets } from "./handlers/listBets.js";
import { showAdminMenu, listAllBets } from "./handlers/adminPanel.js";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);

// -------------------------
// СЕССИИ
// -------------------------
const session = new Map();

function getSession(userId) {
  if (!session.has(userId)) session.set(userId, {});
  return session.get(userId);
}

function clearSession(userId) {
  session.delete(userId);
}

// -------------------------
// ГЛАВНОЕ МЕНЮ
// -------------------------
const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("➕ Добавить ставку", "add_bet")],
  [Markup.button.callback("📌 Актуальные ставки", "live_bets")],
  [Markup.button.callback("📊 Статистика", "stats")],
  [Markup.button.callback("🔧 Админ‑панель", "admin_panel")]
]);

bot.start((ctx) => {
  ctx.reply("Привет! Выбери действие:", mainKeyboard);
});

// -------------------------
// ДОБАВЛЕНИЕ СТАВКИ
// -------------------------
bot.action("add_bet", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("Недостаточно прав.");
  }

  const s = getSession(ctx.from.id);
  s.mode = "adding_bet";
  s.editBetId = null;

  await ctx.reply("Отправь текст или фото ставки одним сообщением.");
});

// -------------------------
// ТЕКСТ/ФОТО: ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ / ЗАМЕНА ФОТО
// -------------------------
bot.on(["text", "photo"], async (ctx) => {
  const s = getSession(ctx.from.id);

  // Добавление новой ставки
  if (s.mode === "adding_bet") {
    await addBet(ctx, db, session);
    return;
  }

  // Редактирование текста ставки
  if (s.mode === "editing_text" && s.editBetId) {
    const newText = ctx.message.text?.trim();
    if (!newText) {
      await ctx.reply("Текст пустой. Отправь новый текст ставки.");
      return;
    }

    await db.collection("bets").doc(s.editBetId).update({
      text: newText
    });

    await ctx.reply("Текст ставки обновлён.");
    clearSession(ctx.from.id);
    return;
  }

  // Замена фото ставки
  if (s.mode === "replacing_photo" && s.editBetId) {
    if (!ctx.message.photo) {
      await ctx.reply("Отправь фото для замены.");
      return;
    }

    const photoId =
      ctx.message.photo[ctx.message.photo.length - 1].file_id;

    await db.collection("bets").doc(s.editBetId).update({
      photoId
    });

    await ctx.reply("Фото ставки обновлено.");
    clearSession(ctx.from.id);
    return;
  }

  await ctx.reply("Выбери действие:", mainKeyboard);
});

// -------------------------
// ВСЕ CALLBACK-и В ОДНОМ МЕСТЕ
// -------------------------
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  // Только админ может в админ‑панель и управлять ставками
  const isAdmin = userId === ADMIN_ID;

  // -------------------------
  // АДМИН‑ПАНЕЛЬ
  // -------------------------
  if (data === "admin_panel") {
    if (!isAdmin) {
      await ctx.reply("Недостаточно прав.");
      return;
    }
    await showAdminMenu(ctx);
    return;
  }

  // -------------------------
  // ПОКАЗАТЬ АКТИВНЫЕ СТАВКИ (видно всем)
  // -------------------------
  if (data === "live_bets") {
    await listBets(ctx, db);
    return;
  }

  // -------------------------
  // СПИСОК ВСЕХ СТАВОК (только админ)
  // -------------------------
  if (data === "all_bets") {
    if (!isAdmin) {
      await ctx.reply("Недостаточно прав.");
      return;
    }
    await listAllBets(ctx, db);
    return;
  }

  // -------------------------
  // ЗАКРЫТЬ СТАВКУ → ВЫБОР РЕЗУЛЬТАТА
  // -------------------------
  if (data.startsWith("close_")) {
    if (!isAdmin) {
      await ctx.reply("Недостаточно прав.");
      return;
    }

    const betId = data.replace("close_", "");

    await ctx.reply(
      "Выберите результат:",
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Выигрыш", `win_${betId}`)],
        [Markup.button.callback("❌ Проигрыш", `lose_${betId}`)]
      ])
    );
    return;
  }

  // -------------------------
  // РЕЗУЛЬТАТ: ВЫИГРЫШ
  // -------------------------
  if (data.startsWith("win_")) {
    if (!isAdmin) {
      await ctx.reply("Недостаточно прав.");
      return;
    }

    const betId = data.replace("win_", "");

    await db.collection("bets").doc(betId).update({
      status: "closed",
      result: "win",
      closed_at: Date.now()
    });

    await ctx.reply("Ставка закрыта как: ✅ Выигрыш");
    return;
  }

  // -------------------------
  // РЕЗУЛЬТАТ: ПРОИГРЫШ
  // -------------------------
  if (data.startsWith("lose_")) {
    if (!isAdmin) {
      await ctx.reply("Недостаточно прав.");
      return;
    }

    const betId = data.replace("lose_", "");

    await db.collection("bets").doc(betId).update({
      status: "closed",
      result: "lose",
      closed_at: Date.now()
    });

    await ctx.reply("Ставка закрыта как: ❌ Проигрыш");
    return;
  }

  // -------------------------
  // РЕДАКТИРОВАНИЕ ТЕКСТА СТАВКИ
  // -------------------------
  if (data.startsWith("edit_")) {
    if (!isAdmin) {
      await ctx.reply("Недостаточно прав.");
      return;
    }

    const betId = data.replace("edit_", "");
    const s = getSession(userId);
    s.mode = "editing_text";
    s.editBetId = betId;

    await ctx.reply("Отправь новый текст для этой ставки.");
    return;
  }

  // -------------------------
  // ЗАМЕНА ФОТО СТАВКИ
  // -------------------------
  if (data.startsWith("photo_")) {
    if (!isAdmin) {
      await ctx.reply("Недостаточно прав.");
      return;
    }

    const betId = data.replace("photo_", "");
    const s = getSession(userId);
    s.mode = "replacing_photo";
    s.editBetId = betId;

    await ctx.reply("Отправь новое фото для этой ставки.");
    return;
  }

  // -------------------------
  // УДАЛЕНИЕ СТАВКИ
  // -------------------------
  if (data.startsWith("delete_")) {
    if (!isAdmin) {
      await ctx.reply("Недостаточно прав.");
      return;
    }

    const betId = data.replace("delete_", "");

    await db.collection("bets").doc(betId).delete();

    await ctx.reply("Ставка удалена.");
    return;
  }

  // -------------------------
  // СТАТИСТИКА (можно и всем, и только админу — оставил всем)
  // -------------------------
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
    return;
  }
});

bot.launch();
console.log("Бот запущен!");




