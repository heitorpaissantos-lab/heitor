const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const MAX_CONTENT_LENGTH = 120000;
const MAX_AGGREGATED_CONTENT = 26000;
const USER_AGENT = 'WebFinderAI/1.0 (+https://example.com)';

function truncateText(text, limit) {
  if (text.length <= limit) return text;
  return text.slice(0, limit).trim() + '...';
}

async function fetchPage(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!response.ok) {
      throw new Error(`Resposta ${response.status}`);
    }
    const text = await response.text();
    return text;
  } catch (error) {
    return null;
  }
}

function cleanHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '');
}

async function parsePage(url) {
  const html = await fetchPage(url);
  if (!html) {
    return { extractedText: '', title: '', error: 'Falha ao carregar a página' };
  }

  const dom = new JSDOM(cleanHtml(html), { url });
  const article = new Readability(dom.window.document).parse();

  if (!article || !article.textContent) {
    return { extractedText: '', title: dom.window.document.title || '', error: 'Conteúdo não extraído' };
  }

  const text = article.textContent.trim().slice(0, MAX_CONTENT_LENGTH);
  return {
    extractedText: text,
    title: article.title || dom.window.document.title || '',
    error: null
  };
}

async function crawlResults(results) {
  const pages = [];
  for (const item of results.slice(0, 20)) {
    const page = await parsePage(item.link);
    pages.push({
      ...item,
      extractedText: page.extractedText,
      title: page.title || item.title,
      error: page.error
    });
  }
  return pages;
}

function extractSummaryContent(pages) {
  const aggregated = pages
    .filter((page) => page.extractedText)
    .map((page) => `Fonte: ${page.title}\nURL: ${page.link}\nConteúdo:\n${page.extractedText}`)
    .join('\n\n---\n\n');

  return truncateText(aggregated, MAX_AGGREGATED_CONTENT);
}

module.exports = { crawlResults, extractSummaryContent };
