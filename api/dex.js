/* Dex · função do Vercel que conversa com a IA.
   A chave NUNCA fica no site: ela é lida das variáveis de ambiente do Vercel.

   Variáveis (Vercel → Settings → Environment Variables):
     GROQ_API_KEY        obrigatória · chave do Groq (começa com gsk_)
     OPENROUTER_API_KEY  opcional   · reserva, usada se o Groq atingir o limite
     DEX_MODELOS_GROQ    opcional   · lista separada por vírgula (padrão abaixo)
     DEX_MODELOS_OR      opcional   · idem, para o OpenRouter
     DEX_ORIGENS         opcional   · outros domínios que podem usar o Dex, separados por vírgula
*/
const { NUCLEO, TRECHOS } = require('./_dex-conhecimento.js');

const MODELOS_GROQ = (process.env.DEX_MODELOS_GROQ || 'openai/gpt-oss-120b,qwen/qwen3.8-27b').split(',').map(s => s.trim()).filter(Boolean);
const MODELOS_OR = (process.env.DEX_MODELOS_OR || 'thinkingmachines/inkling-small:free,nvidia/nemotron-3-ultra-550b-a55b:free').split(',').map(s => s.trim()).filter(Boolean);

const ACOES = new Set(['aba', 'resumo', 'pendencias', 'hoje', 'semana', 'mes30', 'espaco', 'confirmar', 'buscar', 'arte', 'gerar_mes', 'gerar_arte', 'ir_mes',
  'importar_lista', 'importar_fotos', 'unificar', 'sem_foto', 'ajustar', 'chapeleiro', 'zip', 'preparar', 'configuracoes', 'tema', 'editar_dex']);

/* limite simples por visitante, para proteger a cota gratuita */
const visitas = new Map();
function passouDoLimite(ip) {
  const agora = Date.now(), lista = (visitas.get(ip) || []).filter(t => agora - t < 86400000);
  lista.push(agora); visitas.set(ip, lista);
  if (visitas.size > 5000) visitas.clear();
  return lista.filter(t => agora - t < 60000).length > 15 || lista.length > 400;
}

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function trechosPara(pergunta) {
  const p = norm(pergunta), palavras = p.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  return TRECHOS.map(x => {
    let s = 0;
    x.k.forEach(k => { const kk = norm(k); if (kk.length > 2 && p.includes(kk)) s += 3; });
    const t = norm(x.t); palavras.forEach(w => { if (t.includes(w)) s += 1; });
    return { x, s };
  }).filter(o => o.s > 1).sort((a, b) => b.s - a.s).slice(0, 7).map(o => '- ' + o.x.t).join('\n');
}

function instrucoes(nome, contexto, pergunta) {
  return `Você é ${nome}, o assistente do AkiCut: um robozinho simpático, gentil e direto. Responda sempre em português do Brasil, em texto simples e curto (no máximo 4 frases ou uma lista curta), com tom acolhedor e profissional. Não use emojis.

SOBRE O SITE
${NUCLEO}

TRECHOS DO MANUAL QUE PODEM AJUDAR
${trechosPara(pergunta) || '- (nenhum trecho específico; use o resumo acima)'}

SITUAÇÃO ATUAL DA TELA (dados reais do app)
${JSON.stringify(contexto || {})}

AÇÕES
Você pode pedir ao site para fazer algo colocando, no FIM da resposta, uma ou mais marcas exatas (o usuário não vê as marcas):
[[acao:aba:inicio]] [[acao:aba:aniv]] [[acao:aba:arte]] [[acao:aba:colab]] [[acao:aba:novos]] · trocar de aba
[[acao:resumo]] resumo do mês · [[acao:pendencias]] o que falta · [[acao:hoje]] aniversariantes de hoje · [[acao:semana]] próximos 7 dias · [[acao:mes30]] próximos 30 dias
[[acao:espaco]] espaço no Supabase · [[acao:confirmar]] fotos a confirmar · [[acao:sem_foto]] colaboradores sem foto
[[acao:buscar:NOME]] buscar colaborador · [[acao:arte:NOME]] abrir a arte de alguém · [[acao:gerar_arte:NOME]] gerar a arte de alguém
[[acao:ir_mes:MES]] abrir um mês (ex.: novembro) · [[acao:gerar_mes:MES]] gerar as artes de um mês (o site pede confirmação)
[[acao:importar_lista]] [[acao:importar_fotos]] [[acao:unificar]] [[acao:ajustar]] [[acao:chapeleiro]] [[acao:zip]] [[acao:preparar]] [[acao:configuracoes]] [[acao:tema]] [[acao:editar_dex]] · viram um botão para o usuário confirmar
Use uma ação só quando o usuário pedir para fazer ou ver algo. Nunca diga que já fez algo: diga "vou abrir", "aqui está" ou "clique no botão abaixo".

REGRAS
- Fale só do AkiCut e de assuntos de trabalho ligados a ele. Para outros assuntos, responda em uma frase gentil e volte ao app.
- Não invente botões, telas ou números. Se não souber, diga que não tem certeza e sugira onde procurar.
- Use os números da situação atual quando ajudarem.
- Você não vê fotos nem nomes do cadastro; para pessoas específicas, use as ações buscar ou arte.`;
}

function limpar(texto) {
  return String(texto || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<\/?think>/gi, '').trim();
}
function extrairAcoes(texto) {
  const acoes = [];
  const t = texto.replace(/\[\[\s*acao\s*:\s*([a-z_0-9]+)(?:\s*:\s*([^\]]{1,60}))?\s*\]\]/gi, (_, id, arg) => {
    id = id.toLowerCase();
    if (ACOES.has(id) && acoes.length < 3) acoes.push(arg ? { id, arg: arg.trim() } : { id });
    return '';
  });
  return { texto: t.replace(/\n{3,}/g, '\n\n').trim(), acoes };
}

async function chamar(url, chave, corpo, extraHeaders) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 22000);
  try {
    const r = await fetch(url, {
      method: 'POST', signal: ctl.signal,
      headers: Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + chave }, extraHeaders || {}),
      body: JSON.stringify(corpo)
    });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, j };
  } catch (e) { return { status: 0, j: {} }; }
  finally { clearTimeout(timer); }
}

async function perguntar(mensagens) {
  const tentativas = [];
  if (process.env.GROQ_API_KEY) MODELOS_GROQ.forEach(m => tentativas.push({ prov: 'groq', m }));
  if (process.env.OPENROUTER_API_KEY) MODELOS_OR.forEach(m => tentativas.push({ prov: 'or', m }));
  let ultimo = 'sem_chave';
  for (const t of tentativas) {
    const base = { model: t.m, messages: mensagens, temperature: 0.5 };
    let r;
    if (t.prov === 'groq') {
      const extra = /gpt-oss/.test(t.m) ? { reasoning_effort: 'low', max_completion_tokens: 900 } : { max_completion_tokens: 600 };
      r = await chamar('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, Object.assign({}, base, extra));
      if (r.status === 400) r = await chamar('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, Object.assign({}, base, { max_tokens: 600 }));
    } else {
      r = await chamar('https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY, Object.assign({}, base, { max_tokens: 600 }),
        { 'X-Title': 'AkiCut - Dex' });
    }
    const texto = limpar(r.j && r.j.choices && r.j.choices[0] && r.j.choices[0].message && r.j.choices[0].message.content);
    if (r.status === 200 && texto) return { ok: true, texto, modelo: t.m };
    ultimo = r.status === 429 ? 'limite' : r.status === 401 || r.status === 403 ? 'chave_invalida' : 'indisponivel';
  }
  return { ok: false, erro: ultimo };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const temIA = !!(process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);
  if (req.method === 'GET') return res.status(200).json({ ok: true, ia: temIA });
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo' });

  /* só o próprio site pode usar esta função */
  const origem = req.headers.origin || '', host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const extras = (process.env.DEX_ORIGENS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origem) {
    let h = ''; try { h = new URL(origem).host; } catch (e) { }
    if (h !== host && !extras.some(o => origem === o || h === o)) return res.status(403).json({ erro: 'origem' });
  }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (passouDoLimite(ip)) return res.status(429).json({ erro: 'limite' });
  if (!temIA) return res.status(503).json({ erro: 'sem_chave' });

  let corpo = req.body;
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch (e) { corpo = {}; } }
  corpo = corpo || {};
  const nome = String(corpo.nome || 'Dex').replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 20) || 'Dex';
  const hist = (Array.isArray(corpo.mensagens) ? corpo.mensagens : []).slice(-8)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 1200) }));
  if (!hist.length || hist[hist.length - 1].role !== 'user') return res.status(400).json({ erro: 'mensagem' });

  const pergunta = hist[hist.length - 1].content;
  const r = await perguntar([{ role: 'system', content: instrucoes(nome, corpo.contexto, pergunta) }].concat(hist));
  if (!r.ok) return res.status(r.erro === 'limite' ? 429 : 503).json({ erro: r.erro });
  const { texto, acoes } = extrairAcoes(r.texto);
  return res.status(200).json({ texto: texto || 'Certo.', acoes, modelo: r.modelo });
};
