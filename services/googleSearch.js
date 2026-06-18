const { getConfigStatus } = require('./configService');

async function searchGoogle(query) {
  const config = getConfigStatus();
  if (!config.googleConfigured) {
    throw new Error('Google API não configurada.');
  }

  const fetchPage = async (start) => {
    const params = new URLSearchParams({
      key: config.googleKey,
      cx: config.googleCx,
      q: query,
      num: '10',
      start: `${start}`,
      lr: 'lang_pt',
      hl: 'pt',
      safe: 'off'
    });

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Search falhou: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  };

  const firstBatch = await fetchPage(1);
  const secondBatch = await fetchPage(11).catch(() => []);
  const items = [...firstBatch, ...secondBatch].slice(0, 20);

  return items.map((item) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet || item.title || '',
    displayLink: item.displayLink || ''
  }));
}

async function testGoogleConfig() {
  const results = await searchGoogle('teste');
  if (!results || !results.length) {
    throw new Error('Google Search não retornou resultados.');
  }
  return true;
}

module.exports = { searchGoogle, testGoogleConfig };
