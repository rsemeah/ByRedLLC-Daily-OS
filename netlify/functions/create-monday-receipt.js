/**
 * Netlify Serverless Function: create-monday-receipt
 * Route: POST /.netlify/functions/create-monday-receipt
 *
 * Receives: { status, text, createdAt, source }
 * Returns:  { itemId, boardId }
 *
 * Env vars required:
 * - MONDAY_API_TOKEN
 * - MONDAY_BOARD_ID
 *
 * Env vars optional:
 * - MONDAY_GROUP_ID
 * - MONDAY_STATUS_COLUMN_ID
 * - MONDAY_RECEIPT_COLUMN_ID
 * - MONDAY_SOURCE_COLUMN_ID
 * - MONDAY_CREATED_AT_COLUMN_ID
 */

const MONDAY_URL = "https://api.monday.com/v2";
const API_VERSION = "2024-04";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const apiToken = process.env.MONDAY_API_TOKEN;
  const boardId = process.env.MONDAY_BOARD_ID;

  if (!apiToken || !boardId) {
    return respond(500, { error: "MONDAY_API_TOKEN and MONDAY_BOARD_ID must be set" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const status = clean(payload.status || "VERIFIED", 32);
  const text = clean(payload.text, 500);
  const source = clean(payload.source || "Penn Enterprises Workspace", 120);
  const createdAt = clean(payload.createdAt || new Date().toISOString(), 64);

  if (!text) {
    return respond(400, { error: "Receipt text is required" });
  }

  const columnValues = buildColumnValues({ status, text, source, createdAt });
  const itemName = `Receipt: ${text}`.slice(0, 255);

  const query = `
    mutation CreatePennReceipt($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
      }
    }
  `;

  try {
    const mondayRes = await fetch(MONDAY_URL, {
      method: "POST",
      headers: {
        "API-Version": API_VERSION,
        "Authorization": apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          boardId,
          groupId: process.env.MONDAY_GROUP_ID || null,
          itemName,
          columnValues: JSON.stringify(columnValues),
        },
      }),
    });

    const mondayData = await mondayRes.json();

    if (!mondayRes.ok || mondayData.errors) {
      return respond(502, {
        error: "monday.com API error",
        detail: mondayData.errors || mondayData,
      });
    }

    return respond(200, {
      itemId: mondayData.data.create_item.id,
      boardId,
    });
  } catch (err) {
    return respond(500, { error: "Internal error", message: err.message });
  }
};

function buildColumnValues({ status, text, source, createdAt }) {
  const values = {};
  const statusColumn = process.env.MONDAY_STATUS_COLUMN_ID;
  const receiptColumn = process.env.MONDAY_RECEIPT_COLUMN_ID;
  const sourceColumn = process.env.MONDAY_SOURCE_COLUMN_ID;
  const createdColumn = process.env.MONDAY_CREATED_AT_COLUMN_ID;

  if (statusColumn) values[statusColumn] = { label: status };
  if (receiptColumn) values[receiptColumn] = text;
  if (sourceColumn) values[sourceColumn] = source;
  if (createdColumn) values[createdColumn] = { date: createdAt.slice(0, 10) };

  return values;
}

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function respond(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(body),
  };
}
