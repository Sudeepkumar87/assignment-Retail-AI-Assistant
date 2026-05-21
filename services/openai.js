import OpenAI from 'openai';
import { searchProducts } from '../tools/searchProducts.js';
import { getProduct } from '../tools/getProduct.js';
import { getOrder } from '../tools/getOrder.js';
import { evaluateReturn } from '../tools/evaluateReturn.js';

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const tools = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description:
        "Search the product inventory for items matching the customer's request. Use this for shopping/recommendation queries. Always verify size and stock.",
      parameters: {
        type: 'object',
        properties: {
          size: { type: 'string', description: 'Dress size e.g. "8", "14", "16"' },
          maxPrice: { type: 'string', description: 'Maximum price in USD e.g. "300"' },
          tags: { type: 'string', description: 'Comma-separated style tags e.g. "modest,evening,lace"' },
          saleOnly: { type: 'string', description: 'Set to "true" to return only sale items' },
          clearanceExcluded: { type: 'string', description: 'Set to "true" to exclude clearance items' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product',
      description: 'Retrieve full details for a specific product by product_id.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'Product ID e.g. "P0042"' },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Retrieve order details by order_id. Use this before evaluating a return request.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'Order ID e.g. "O0043"' },
        },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'evaluate_return',
      description:
        'Evaluate whether an order is eligible for a return or exchange based on store policy.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'Order ID to evaluate e.g. "O0043"' },
        },
        required: ['order_id'],
      },
    },
  },
];

// Coerce all args to correct types before calling tools
function executeTool(name, args) {
  switch (name) {
    case 'search_products': {
      const coerced = {
        size: args.size,
        maxPrice: args.maxPrice !== undefined ? parseFloat(args.maxPrice) : undefined,
        tags: args.tags ? args.tags.split(',').map(t => t.trim()) : undefined,
        saleOnly: args.saleOnly === 'true' || args.saleOnly === true,
        clearanceExcluded: args.clearanceExcluded === 'true' || args.clearanceExcluded === true,
      };
      return searchProducts(coerced);
    }
    case 'get_product':
      return getProduct(args.product_id);
    case 'get_order':
      return getOrder(args.order_id);
    case 'evaluate_return':
      return evaluateReturn(args.order_id);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

const SYSTEM_PROMPT = `You are a helpful retail AI assistant for a boutique clothing store.
You have TWO roles:

1. PERSONAL SHOPPER: Help customers find dresses and clothing that match their style, size, budget, and preferences.
2. CUSTOMER SUPPORT: Help customers with return and exchange requests by applying store policy rules.

CRITICAL RULES — NEVER VIOLATE:
- You MUST use tools to retrieve all product, order, and return data. Never invent or guess.
- When calling get_product, always use the product_id field (e.g. "P0042") from search results — never use the product title as the ID.
- If an order ID or product ID does not exist in the system, say so clearly and do NOT fabricate details.
- Always reason transparently: explain WHY a product fits the customer's needs or WHY a return is eligible/ineligible.
- For product recommendations, always mention: price, sale status, size availability, stock, and why it matches.
- For return decisions, always cite the specific policy rule that applies.
- Be warm, professional, and helpful.`;

export async function chat(conversationHistory) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...conversationHistory];

  let response = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    parallel_tool_calls: false,
    messages,
    tools,
    tool_choice: 'auto',
  });

  while (response.choices[0].finish_reason === 'tool_calls') {
    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    const toolResults = [];
    for (const toolCall of assistantMessage.tool_calls) {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`\n  🔧 Calling tool: ${name}(${JSON.stringify(args)})`);
      const result = executeTool(name, args);
      toolResults.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    messages.push(...toolResults);

    response = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      parallel_tool_calls: false,
      messages,
      tools,
      tool_choice: 'auto',
    });
  }

  return response.choices[0].message.content;
}
