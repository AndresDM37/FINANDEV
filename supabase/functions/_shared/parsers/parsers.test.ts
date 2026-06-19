// Tests de los parsers de correos bancarios.
// Ejecutar: deno test --allow-read supabase/functions/_shared/parsers/
import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { parseEmail } from "./index.ts";
import { parseAmount, parseDate } from "./common.ts";
import type { ParsedTransaction } from "../types.ts";

const RECEIVED_AT = new Date("2026-06-10T22:00:00Z");
const FIXTURES_DIR = new URL("./fixtures/", import.meta.url);

interface Fixture {
  from: string;
  subject: string;
  body: string;
}

async function loadFixture(name: string): Promise<Fixture> {
  const raw = await Deno.readTextFile(new URL(name, FIXTURES_DIR));
  const [headers, ...bodyParts] = raw.split(/\r?\n\r?\n/);
  const from = headers.match(/^From:\s*(.+)$/m)?.[1] ?? "";
  const subject = headers.match(/^Subject:\s*(.+)$/m)?.[1] ?? "";
  return { from, subject, body: bodyParts.join("\n\n") };
}

async function parseFixture(name: string) {
  const f = await loadFixture(name);
  return parseEmail(f.from, f.subject, f.body, RECEIVED_AT);
}

function asTx(outcome: ParsedTransaction | "not-transaction" | null): ParsedTransaction {
  if (outcome === null || outcome === "not-transaction") {
    throw new Error(`Se esperaba una transacción, se obtuvo: ${outcome}`);
  }
  return outcome;
}

// ── parseAmount ─────────────────────────────────

Deno.test("parseAmount: formato latino con decimales", () => {
  assertEquals(parseAmount("$85.400,00"), 85400);
});

Deno.test("parseAmount: miles con punto sin decimales", () => {
  assertEquals(parseAmount("$200.000"), 200000);
});

Deno.test("parseAmount: millones con varios puntos", () => {
  assertEquals(parseAmount("$1.500.000"), 1500000);
});

Deno.test("parseAmount: formato anglo", () => {
  assertEquals(parseAmount("$1,500,000.50"), 1500000.5);
});

Deno.test("parseAmount: decimal simple con coma", () => {
  assertEquals(parseAmount("50,5"), 50.5);
});

Deno.test("parseAmount: texto sin monto devuelve null", () => {
  assertEquals(parseAmount("sin numeros"), null);
});

// ── parseDate ───────────────────────────────────

Deno.test("parseDate: dd/mm/yyyy", () => {
  assertEquals(parseDate("10/06/2026", RECEIVED_AT), "2026-06-10");
});

Deno.test("parseDate: dd/mm sin año usa el del correo", () => {
  assertEquals(parseDate("09/06", RECEIVED_AT), "2026-06-09");
});

Deno.test("parseDate: null usa la fecha del correo", () => {
  assertEquals(parseDate(null, RECEIVED_AT), "2026-06-10");
});

// ── Bancolombia ─────────────────────────────────

Deno.test("bancolombia: compra con tarjeta", async () => {
  const result = await parseFixture("bancolombia-compra.txt");
  assertExists(result);
  assertEquals(result.bank, "bancolombia");
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "expense");
  assertEquals(tx.amount, 85400);
  assertEquals(tx.merchant, "EXITO CALLE 80");
  assertEquals(tx.date, "2026-06-10");
  assertEquals(tx.cardLast4, "5678");
});

Deno.test("bancolombia: retiro en cajero", async () => {
  const result = await parseFixture("bancolombia-retiro.txt");
  assertExists(result);
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "expense");
  assertEquals(tx.amount, 200000);
  assertEquals(tx.date, "2026-06-09");
});

Deno.test("bancolombia: transferencia recibida es ingreso", async () => {
  const result = await parseFixture("bancolombia-transferencia-recibida.txt");
  assertExists(result);
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "income");
  assertEquals(tx.amount, 1500000);
});

Deno.test("bancolombia: 'Compraste $X en Y' (formato real)", async () => {
  const result = await parseFixture("bancolombia-compraste.txt");
  assertExists(result);
  assertEquals(result.bank, "bancolombia");
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "expense");
  assertEquals(tx.amount, 7800);
  assertEquals(tx.merchant, "DLO*Didi");
  assertEquals(tx.date, "2026-06-16");
  assertEquals(tx.cardLast4, "5194");
});

Deno.test("bancolombia: 'recibiste una transferencia de X por $Y' es ingreso", async () => {
  const result = await parseFixture("bancolombia-transferencia-llave.txt");
  assertExists(result);
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "income");
  assertEquals(tx.amount, 200000);
  assertEquals(tx.merchant, "MARCOS MARCHENA MENDOZA");
  assertEquals(tx.date, "2026-06-16");
});

Deno.test("bancolombia: compra rechazada NO es transacción", async () => {
  const result = await parseFixture("bancolombia-rechazada.txt");
  assertExists(result);
  assertEquals(result.outcome, "not-transaction");
});

Deno.test("bancolombia: OTP NO es transacción", async () => {
  const result = await parseFixture("bancolombia-otp.txt");
  assertExists(result);
  assertEquals(result.outcome, "not-transaction");
});

// ── Nequi ───────────────────────────────────────

Deno.test("nequi: compra", async () => {
  const result = await parseFixture("nequi-compra.txt");
  assertExists(result);
  assertEquals(result.bank, "nequi");
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "expense");
  assertEquals(tx.amount, 42500);
  assertEquals(tx.merchant, "RAPPI COLOMBIA");
  assertEquals(tx.date, "2026-06-10");
});

Deno.test("nequi: 'Hiciste un pago en X por $Y' es gasto (formato real)", async () => {
  const result = await parseFixture("nequi-pago.txt");
  assertExists(result);
  assertEquals(result.bank, "nequi");
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "expense");
  assertEquals(tx.amount, 20230);
  assertEquals(tx.merchant, "FONDO DE INVERSIÓN COLECTIVA ACCIVAL VISTA");
});

Deno.test("nequi: envío de plata es gasto", async () => {
  const result = await parseFixture("nequi-envio.txt");
  assertExists(result);
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "expense");
  assertEquals(tx.amount, 30000);
  assertEquals(tx.merchant, "Envío a MARIA GOMEZ");
});

Deno.test("nequi: plata recibida es ingreso", async () => {
  const result = await parseFixture("nequi-recibido.txt");
  assertExists(result);
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "income");
  assertEquals(tx.amount, 75000);
});

// ── Nu ──────────────────────────────────────────

Deno.test("nu: compra con tarjeta", async () => {
  const result = await parseFixture("nu-compra.txt");
  assertExists(result);
  assertEquals(result.bank, "nu");
  const tx = asTx(result.outcome);
  assertEquals(tx.direction, "expense");
  assertEquals(tx.amount, 58900);
  assertEquals(tx.merchant, "NETFLIX COM");
  assertEquals(tx.cardLast4, "4321");
});

Deno.test("nu: estado de cuenta NO es transacción", async () => {
  const result = await parseFixture("nu-estado-cuenta.txt");
  assertExists(result);
  assertEquals(result.outcome, "not-transaction");
});

// ── Remitente desconocido ───────────────────────

Deno.test("remitente desconocido devuelve null", () => {
  const result = parseEmail(
    "spam@example.com",
    "Oferta",
    "Compra por $10.000 en TIENDA",
    RECEIVED_AT,
  );
  assertEquals(result, null);
});
