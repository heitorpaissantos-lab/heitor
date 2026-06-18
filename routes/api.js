const express = require('express');
const router = express.Router();
const { searchGoogle, testGoogleConfig } = require('../services/googleSearch');
const { crawlResults, extractSummaryContent } = require('../services/contentExtractor');
const { generateReport, testOpenAI } = require('../services/openaiService');
const { getConfigStatus, saveConfig } = require('../services/configService');

router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Pesquisa inválida. Informe um termo.' });
    }

    const config = getConfigStatus();
    if (!config.openaiConfigured || !config.googleConfigured) {
      return res.status(400).json({ error: 'As APIs não estão configuradas. Acesse Configurações.' });
    }

    const searchResults = await searchGoogle(query);
    const pages = await crawlResults(searchResults);
    const processedSources = pages.map((page) => ({
      title: page.title,
      url: page.link,
      snippet: page.snippet,
      processed: Boolean(page.extractedText),
      error: page.error || null
    }));

    const aggregatedText = extractSummaryContent(pages);
    const aiResponse = await generateReport(query, aggregatedText, processedSources);

    res.json({
      query,
      sources: processedSources,
      processedCount: processedSources.filter((source) => source.processed).length,
      ai: aiResponse
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message || 'Erro interno ao processar pesquisa.' });
  }
});

router.get('/config', (req, res) => {
  res.json(getConfigStatus());
});

router.post('/config', async (req, res) => {
  try {
    const { openaiKey, googleKey, googleCx } = req.body;
    if (!openaiKey || !googleKey || !googleCx) {
      return res.status(400).json({ error: 'Preencha todos os campos de configuração.' });
    }
    const status = await saveConfig({ openaiKey, googleKey, googleCx });
    res.json({ message: 'Configurações salvas com sucesso.', status });
  } catch (error) {
    console.error('Config save error:', error);
    res.status(500).json({ error: error.message || 'Erro ao salvar configuração.' });
  }
});

router.post('/config/test', async (req, res) => {
  try {
    const config = getConfigStatus();
    if (!config.openaiConfigured || !config.googleConfigured) {
      return res.status(400).json({ error: 'As APIs não estão configuradas.' });
    }

    await testGoogleConfig();
    await testOpenAI();

    res.json({ message: 'Conexões com OpenAI e Google estão funcionando.' });
  } catch (error) {
    console.error('Config test error:', error);
    res.status(500).json({ error: error.message || 'Erro ao testar conexões.' });
  }
});

module.exports = router;
