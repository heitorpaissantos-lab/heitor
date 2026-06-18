const searchQuery = document.getElementById('searchQuery');
const searchButton = document.getElementById('searchButton');
const progressPanel = document.getElementById('progressPanel');
const progressFill = document.getElementById('progressFill');
const processingCount = document.getElementById('processingCount');
const resultsPanel = document.getElementById('resultsPanel');
const shortSummary = document.getElementById('shortSummary');
const detailedSummary = document.getElementById('detailedSummary');
const factsList = document.getElementById('factsList');
const topicsList = document.getElementById('topicsList');
const sourcesList = document.getElementById('sourcesList');
const sourceCount = document.getElementById('sourceCount');
const resultsSubtitle = document.getElementById('resultsSubtitle');
const historyList = document.getElementById('historyList');
const openaiKeyInput = document.getElementById('openaiKey');
const googleKeyInput = document.getElementById('googleKey');
const googleCxInput = document.getElementById('googleCx');
const saveConfigButton = document.getElementById('saveConfigButton');
const testConfigButton = document.getElementById('testConfigButton');
const copyButton = document.getElementById('copyButton');
const downloadPdfButton = document.getElementById('downloadPdfButton');
const toast = document.getElementById('toast');
const panelButtons = document.querySelectorAll('.nav-button');

let history = [];

function showPanel(panelId) {
  document.querySelectorAll('.main-content > section').forEach((section) => {
    section.classList.add('hidden');
  });
  document.getElementById(panelId).classList.remove('hidden');
  panelButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelId);
  });
}

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.style.background = type === 'error' ? 'rgba(107, 25, 38, 0.92)' : 'rgba(19, 29, 59, 0.96)';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3600);
}

function setProgress(value) {
  progressPanel.classList.remove('hidden');
  progressFill.style.width = `${value}%`;
}

function buildSourceItem(source) {
  const wrapper = document.createElement('div');
  wrapper.className = 'source-item';
  wrapper.innerHTML = `
    <a href="${source.url}" target="_blank" rel="noreferrer">${source.title}</a>
    <p>${source.snippet}</p>
    <div class="source-status">${source.processed ? 'Processado' : 'Falha'} • ${source.error || 'OK'}</div>
  `;
  return wrapper;
}

function renderResults(data) {
  resultsPanel.classList.remove('hidden');
  shortSummary.textContent = data.ai.resumo_curto || 'Não foi possível gerar resumo curto.';
  detailedSummary.textContent = data.ai.resumo_detalhado || 'Não foi possível gerar resumo detalhado.';

  factsList.innerHTML = '';
  (data.ai.principais_fatos || []).forEach((fact) => {
    const item = document.createElement('li');
    item.textContent = fact;
    factsList.appendChild(item);
  });

  topicsList.innerHTML = '';
  (data.ai.topicos_importantes || []).forEach((topic) => {
    const item = document.createElement('li');
    item.textContent = topic;
    topicsList.appendChild(item);
  });

  sourcesList.innerHTML = '';
  data.sources.forEach((source) => sourcesList.appendChild(buildSourceItem(source)));
  sourceCount.textContent = `${data.processedCount} de ${data.sources.length} processados`;
  resultsSubtitle.textContent = `Pesquisa: ${data.query}`;
  setProgress(100);
}

function saveHistory(item) {
  history.unshift(item);
  history = history.slice(0, 6);
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  history.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <h3>${item.query}</h3>
      <p>${item.summary}</p>
      <p><strong>Fontes:</strong> ${item.sources}</p>
    `;
    historyList.appendChild(card);
  });
}

async function fetchConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function loadConfig() {
  const config = await fetchConfig();
  if (!config) return;
  openaiKeyInput.value = config.openaiKey || '';
  googleKeyInput.value = config.googleKey || '';
  googleCxInput.value = config.googleCx || '';
}

async function saveConfig() {
  const body = {
    openaiKey: openaiKeyInput.value.trim(),
    googleKey: googleKeyInput.value.trim(),
    googleCx: googleCxInput.value.trim()
  };
  const response = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    showToast(data.error || 'Erro ao salvar configuração.', 'error');
    return;
  }
  showToast(data.message || 'Configuração salva com sucesso.');
}

async function testConfig() {
  const response = await fetch('/api/config/test', { method: 'POST' });
  const data = await response.json();
  if (!response.ok) {
    showToast(data.error || 'Teste de conexão falhou.', 'error');
    return;
  }
  showToast(data.message || 'Conexão testada com sucesso.');
}

async function search() {
  const query = searchQuery.value.trim();
  if (!query) {
    showToast('Digite algo para pesquisar.', 'error');
    return;
  }

  resultsPanel.classList.add('hidden');
  setProgress(20);
  processingCount.textContent = 'Iniciando...';

  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await response.json();

  if (!response.ok) {
    showToast(data.error || 'Erro ao realizar pesquisa.', 'error');
    return;
  }

  setProgress(60);
  processingCount.textContent = `${data.processedCount} sites processados`;
  renderResults(data);
  saveHistory({ query: data.query, summary: data.ai.resumo_curto || 'Resumo gerado', sources: data.sources.length });
}

function copySummary() {
  const text = `${shortSummary.textContent}\n\n${detailedSummary.textContent}`;
  navigator.clipboard.writeText(text).then(() => showToast('Resumo copiado para a área de transferência.')); 
}

function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const title = `WebFinder AI - Resumo`;
  const lines = doc.splitTextToSize(
    `Pesquisa: ${searchQuery.value}\n\nResumo curto:\n${shortSummary.textContent}\n\nResumo detalhado:\n${detailedSummary.textContent}\n\nPrincipais fatos:\n${Array.from(factsList.children).map((item) => `- ${item.textContent}`).join('\n')}\n\nTópicos importantes:\n${Array.from(topicsList.children).map((item) => `- ${item.textContent}`).join('\n')}`,
    520
  );
  doc.setFontSize(16);
  doc.text(title, 40, 50);
  doc.setFontSize(11);
  doc.text(lines, 40, 80);
  doc.save(`webfinder-ai-resumo-${Date.now()}.pdf`);
  showToast('PDF exportado com sucesso.');
}

panelButtons.forEach((button) => {
  button.addEventListener('click', () => showPanel(button.dataset.panel));
});

searchButton.addEventListener('click', search);
saveConfigButton.addEventListener('click', saveConfig);
testConfigButton.addEventListener('click', testConfig);
copyButton.addEventListener('click', copySummary);
downloadPdfButton.addEventListener('click', downloadPdf);
searchQuery.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') search();
});

loadConfig();
showPanel('search-panel');
