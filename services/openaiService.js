const { Configuration, OpenAIApi } = require('openai');
const { getConfigStatus } = require('./configService');

function getClient() {
  const config = getConfigStatus();
  if (!config.openaiConfigured) {
    throw new Error('OpenAI API não configurada.');
  }
  const configuration = new Configuration({ apiKey: config.openaiKey });
  return new OpenAIApi(configuration);
}

async function generateReport(query, content, sources) {
  const client = getClient();
  const prompt = `Você é um assistente avançado que resume informações coletadas da web. O usuário pesquisou: "${query}".

Aqui estão as informações extraídas das páginas encontradas:

${content}

Gere uma resposta JSON com as seguintes chaves:
- resumo_curto: resumo objetivo com até 4 frases.
- resumo_detalhado: explicação completa e estruturada sobre o assunto.
- principais_fatos: lista com os principais fatos ou insights.
- topicos_importantes: lista com os tópicos mais relevantes.

Resposta JSON precisa ser válida.`;

  const response = await client.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Você é um assistente inteligente, claro e objetivo.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1100
  });

  const text = response.data.choices[0].message.content;
  let json = {
    resumo_curto: '',
    resumo_detalhado: '',
    principais_fatos: [],
    topicos_importantes: []
  };

  try {
    json = JSON.parse(text);
  } catch (parseError) {
    json.resumo_detalhado = text;
    json.principais_fatos = ['Não foi possível analisar o JSON gerado.'];
    json.topicos_importantes = [];
  }

  return json;
}

async function testOpenAI() {
  const client = getClient();
  const response = await client.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Teste de conexão com API OpenAI.' },
      { role: 'user', content: 'Responda com OK.' }
    ],
    temperature: 0,
    max_tokens: 10
  });
  if (!response.data.choices || !response.data.choices[0].message) {
    throw new Error('Resposta inválida da OpenAI.');
  }
  return true;
}

module.exports = { generateReport, testOpenAI };
