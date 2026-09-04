// Decodifica entidades HTML (ex: &amp; , &#x3c2; , &#39;) para texto normal
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// fetch com timeout — evita que a função fique presa esperando uma
// resposta lenta e estoure o limite de execução da Vercel
async function fetchComTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { link } = req.query;
  if (!link || !link.includes('chat.whatsapp.com')) {
    return res.status(400).json({ error: 'Cole um link válido do WhatsApp (chat.whatsapp.com/...)' });
  }

  try {
    const pageRes = await fetchComTimeout(link, {
      headers: {
        // finge ser um "bot de prévia" pra garantir que o whatsapp devolva o HTML com as meta tags
        'User-Agent': 'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)'
      }
    }, 8000);
    const html = await pageRes.text();

    const getMeta = (prop) => {
      const regex = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    // Decodifica logo ao extrair, pra tudo daqui pra frente já vir limpo
    const nome = decodeHtmlEntities(getMeta('og:title'));
    const imagem = decodeHtmlEntities(getMeta('og:image'));

    if (!nome) {
      return res.status(404).json({ error: 'Não foi possível encontrar os dados. Link inválido ou expirado.' });
    }

    // Usamos a imagem direto do WhatsApp em vez de reenviar pro imgbb —
    // reenviar exige baixar a imagem inteira e subir de novo, o que é
    // a principal causa da função estourar o tempo limite da Vercel.
    // A URL do WhatsApp já é estável o suficiente pra esse uso.
    return res.status(200).json({ nome, imagem });
  } catch (err) {
    console.error(err);
    const timeout = err.name === 'AbortError';
    return res.status(timeout ? 504 : 500).json({
      error: timeout
        ? 'O WhatsApp demorou demais pra responder. Tente novamente.'
        : 'Erro ao buscar dados do link.'
    });
  }
}