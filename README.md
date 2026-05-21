# Retail AI Assistant

A Node.js agentic AI system that simulates a **Personal Shopper** and **Customer Support Assistant** for a retail clothing store.

## Features

- 🛍️ **Personal Shopper** — Recommends products based on size, price, style tags, and sale status
- 🔄 **Return Support** — Evaluates return eligibility by applying real policy rules
- 🤖 **Agentic Tool Calling** — AI dynamically decides which tool to call
- 🚫 **Hallucination-free** — All data comes from CSVs and policy file; nothing is invented

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Groq API key
Get a free API key at **console.groq.com** → API Keys

Create a `.env` file:
```
GROQ_API_KEY=gsk_...your_key_here...
```

### 3. Run
```bash
node index.js
```

## Example Queries

### Personal Shopper
```
I need a modest evening gown under $300 in size 8
What sale dresses do you have in size 10?
Show me lace cocktail dresses in size 6
```

### Customer Support
```
Can I return order O0005?
I want to return order O0003 — it doesn't fit
What is the return policy for order O0030?
```

### Edge Cases
```
Can I return order O9999?
What about order XYZ123?
```

## Project Structure

```
retail-ai-agent/
├── data/
│   ├── orders.csv              # Order history
│   ├── product_inventory.csv   # Product catalog
│   └── policy.txt              # Return policy rules
│
├── tools/
│   ├── searchProducts.js       # Filter + rank products
│   ├── getProduct.js           # Fetch single product
│   ├── getOrder.js             # Fetch single order
│   └── evaluateReturn.js       # Apply policy rules to an order
│
├── loaders/
│   └── loadData.js             # CSV + policy file readers
│
├── services/
│   └── openai.js               # AI agent with tool calling loop
│
├── index.js                    # CLI entry point
└── ARCHITECTURE.md             # Architecture explanation
```

## Tech Stack

- Node.js (ES Modules)
- Groq API (free) — `meta-llama/llama-4-scout-17b-16e-instruct`
- openai npm package (Groq-compatible)
- csv-parse
- dotenv
