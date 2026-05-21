import readline from 'readline';
import 'dotenv/config';
import { chat } from './services/openai.js';

// Check for API key on startup
if (!process.env.GROQ_API_KEY) {
  console.error('\n❌ Error: GROQ_API_KEY is not set.');
  console.error('Create a .env file with: GROQ_API_KEY=your_key_here\n');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const conversationHistory = [];

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║       🛍️  Retail AI Assistant — Ready            ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║  Personal Shopper + Customer Support             ║');
console.log('║  Type "exit" to quit                             ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('\nTry:');
console.log('  • "I need a modest evening gown under $300 in size 8"');
console.log('  • "Can I return order O0005?"');
console.log('  • "What sale dresses do you have in size 10?"');
console.log('');

function askQuestion() {
  rl.question('You: ', async (input) => {
    const userMessage = input.trim();

    if (!userMessage) {
      askQuestion();
      return;
    }

    if (userMessage.toLowerCase() === 'exit') {
      console.log('\nGoodbye! 👋\n');
      rl.close();
      return;
    }

    conversationHistory.push({ role: 'user', content: userMessage });

    try {
      console.log('\nAssistant: (thinking...)\n');
      const reply = await chat([...conversationHistory]);
      conversationHistory.push({ role: 'assistant', content: reply });
      console.log(`Assistant: ${reply}\n`);
    } catch (err) {
      if (err.status === 401) {
        console.error('❌ Invalid API key. Please check your GROQ_API_KEY in .env\n');
      } else {
        console.error(`❌ Error: ${err.message}\n`);
      }
    }

    askQuestion();
  });
}

askQuestion();
