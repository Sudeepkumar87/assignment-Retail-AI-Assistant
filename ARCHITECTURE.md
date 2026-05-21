# Architecture Document — Retail AI Assistant

## Overview

This system is a single agentic AI assistant capable of two roles: **Personal Shopper** and **Customer Support**. It uses Groq's free API (`meta-llama/llama-4-scout-17b-16e-instruct`) with function/tool calling to dynamically decide what data to retrieve before generating a response.

---

## Why Tool-Based Architecture?

The core problem with naive LLM assistants is hallucination — they can invent product names, stock levels, prices, or return decisions. This is unacceptable in retail.

The solution is a **retrieval-first architecture**:

```
User Input → AI Agent → Tool Call → Real Data → AI Reasoning → Response
```

The AI is never allowed to answer a product or order question from memory. It must call a tool first. This separates two concerns cleanly:

- **Reasoning** (what the AI does): Understanding the request, applying logic, explaining decisions
- **Data retrieval** (what tools do): Reading from CSVs, applying policy rules, checking stock

---

## How Tools Are Selected

The AI receives four tool definitions and decides which to call based on the user's message:

| Tool | Purpose |
|---|---|
| `search_products(filters)` | Find products by size, price, tags, sale status |
| `get_product(product_id)` | Get full details of one product |
| `get_order(order_id)` | Retrieve an order record |
| `evaluate_return(order_id)` | Apply policy rules and determine return eligibility |

The model reads the user's message and the tool descriptions, then decides which tool(s) to call — without any manual `if/else` routing. This is true agentic behavior.

For example:
- "Can I return order O0005?" → AI calls `evaluate_return("O0005")`
- "Show me modest dresses under $200" → AI calls `search_products({tags:["modest"], maxPrice:200})`

---

## How Hallucination Is Minimized

1. **All product/order data comes exclusively from CSVs.** The AI has no product knowledge from training.
2. **All return decisions come from `policy.txt`.** Rules are read from the file, not embedded in prompts.
3. **If an order or product is not found, the tool returns an explicit error object** — the AI then tells the user clearly instead of guessing.
4. **The system prompt instructs the AI never to invent data**, and to always cite which rule applies.
5. **Stock is verified per-size** before recommending a product — a product that shows as "available in size 8" but has 0 stock is rejected.

---

## Agentic Loop

The agent uses a `while` loop around the API call:

```
1. Send messages to the model
2. If response has tool_calls → execute tools → append results → repeat
3. If response has no tool_calls → return final answer to user
```

This allows multi-step reasoning, e.g.:
- Step 1: `get_order("O0005")`
- Step 2: `evaluate_return("O0005")` ← AI may chain two calls
- Step 3: Explain the result to the user

---

## Tool Parameter Design

All tool parameters use `string` type in the schema for maximum compatibility across models. Type coercion happens in the `executeTool` function before the data reaches the actual tool logic:

- `maxPrice` → `parseFloat()`
- `saleOnly` / `clearanceExcluded` → `=== 'true'` boolean check
- `tags` → `split(',')` into an array

This prevents type mismatch errors that some models produce when asked to generate booleans or numbers directly.

---

## Policy Engine Logic (`evaluateReturn`)

Rules are applied in this priority order:

1. **Clearance** → Final sale, no return/exchange
2. **Aurelia Couture** → Exchange only, no refunds
3. **Nocturne** → 21-day extended return window
4. **Sale items** → 7 days, store credit only
5. **Normal items** → 14 days, full refund

Days since order is calculated dynamically from `order_date` vs today's date.

---

## Product Ranking Logic (`searchProducts`)

Products are filtered by:
- Size availability (the size must exist AND have stock > 0)
- Price ceiling
- Tag matching (any tag match)
- Sale-only flag

Then sorted by:
1. Sale items first
2. `bestseller_score` descending

This ensures the AI recommends the most commercially relevant items first.

---

## Conversation Memory

The full conversation history is passed on every API call. The AI maintains context across turns, so a follow-up like "What about in size 10?" works correctly without repeating the original query.

---

## Summary

| Requirement | How Met |
|---|---|
| Tool calling | Groq function calling with agentic loop |
| No hallucination | Data-only from CSV + policy file |
| Dynamic tool selection | Model decides based on tool descriptions |
| Multi-constraint reasoning | searchProducts applies 5+ filters simultaneously |
| Invalid ID handling | Tools return explicit error objects |
| Policy-based returns | evaluateReturn reads policy and applies rules in order |
| Type safety | All schema params are strings; coercion done in executeTool |
