const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

function readEnv() {
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const vars = {};
  env.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      vars[match[1].trim()] = match[2].trim();
    }
  });
  return vars;
}

function writeEnv(vars) {
  const lines = [];
  const existing = readEnv();
  const final = {
    OPENAI_API_KEY: existing.OPENAI_API_KEY || '',
    GOOGLE_API_KEY: existing.GOOGLE_API_KEY || '',
    GOOGLE_SEARCH_ENGINE_ID: existing.GOOGLE_SEARCH_ENGINE_ID || '',
    ...existing,
    ...vars
  };

  Object.keys(final).forEach((key) => {
    lines.push(`${key}=${final[key]}`);
  });
  fs.writeFileSync(envPath, lines.join('\n'));
}

function getConfigStatus() {
  const env = readEnv();
  return {
    openaiConfigured: Boolean(env.OPENAI_API_KEY),
    googleConfigured: Boolean(env.GOOGLE_API_KEY && env.GOOGLE_SEARCH_ENGINE_ID),
    openaiKey: env.OPENAI_API_KEY || '',
    googleKey: env.GOOGLE_API_KEY || '',
    googleCx: env.GOOGLE_SEARCH_ENGINE_ID || ''
  };
}

async function saveConfig({ openaiKey, googleKey, googleCx }) {
  writeEnv({
    OPENAI_API_KEY: openaiKey,
    GOOGLE_API_KEY: googleKey,
    GOOGLE_SEARCH_ENGINE_ID: googleCx
  });
  return getConfigStatus();
}

module.exports = { getConfigStatus, saveConfig };
