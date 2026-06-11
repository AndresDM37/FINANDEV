// Cliente mínimo de la API de Gmail (solo lectura) vía fetch.

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailMessageRef {
  id: string;
  threadId: string;
}

export interface GmailMessage {
  id: string;
  internalDate: string; // epoch ms como string
  payload: GmailPayload;
  snippet: string;
}

interface GmailPayload {
  mimeType: string;
  headers: { name: string; value: string }[];
  body?: { data?: string };
  parts?: GmailPayload[];
}

async function gmailFetch(accessToken: string, path: string): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API falló (${res.status}): ${await res.text()}`);
  }
  return res;
}

/** Lista IDs de mensajes que cumplen el query de búsqueda de Gmail. */
export async function listMessages(
  accessToken: string,
  query: string,
  maxResults = 25,
): Promise<GmailMessageRef[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });
  const res = await gmailFetch(accessToken, `/messages?${params}`);
  const data = await res.json();
  return data.messages ?? [];
}

/** Trae un mensaje completo. */
export async function getMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailMessage> {
  const res = await gmailFetch(accessToken, `/messages/${messageId}?format=full`);
  return await res.json();
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function findPart(
  payload: GmailPayload,
  mimeType: string,
): GmailPayload | null {
  if (payload.mimeType === mimeType && payload.body?.data) return payload;
  for (const part of payload.parts ?? []) {
    const found = findPart(part, mimeType);
    if (found) return found;
  }
  return null;
}

export function getHeader(message: GmailMessage, name: string): string {
  return (
    message.payload.headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

/** Extrae el cuerpo del mensaje: prefiere text/plain, cae a text/html, luego snippet. */
export function getBody(message: GmailMessage): string {
  const plain = findPart(message.payload, "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);

  const html = findPart(message.payload, "text/html");
  if (html?.body?.data) return decodeBase64Url(html.body.data);

  return message.snippet ?? "";
}
