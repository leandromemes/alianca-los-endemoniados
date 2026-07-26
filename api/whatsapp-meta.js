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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { link } = req.query;
  if (!link || !link.includes('chat.whatsapp.com')) {
    return res.status(400).json({ error: 'Cole um link válido do WhatsApp (chat.whatsapp.com/...)' });
  }

  try {
    const pageRes = await fetch(link, {
      headers: {
        // finge ser um "bot de prévia" pra garantir que o whatsapp devolva o HTML com as meta tags
        'User-Agent': 'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)'
      }
    });
    const html = await pageRes.text();

    const getMeta = (prop) => {
      const regex = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    // Decodifica logo ao extrair, pra tudo daqui pra frente já vir limpo
    const nome = decodeHtmlEntities(getMeta('og:title'));
    let imagem = decodeHtmlEntities(getMeta('og:image'));

    if (!nome) {
      return res.status(404).json({ error: 'Não foi possível encontrar os dados. Link inválido ou expirado.' });
    }

    // Reenvia a imagem pro imgbb pra ficar salva de forma permanente
    if (imagem) {
      try {
        const imgRes = await fetch(imagem);
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const IMGBB_API_KEY = process.env.IMGBB_API_KEY || "8bf2a05fe7578df492f6bdb4f10f9925";

        const formData = new URLSearchParams();
        formData.append('image', base64);

        const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData?.data?.url) imagem = uploadData.data.url;
      } catch (imgErr) {
        console.error('Erro ao reenviar imagem pro imgbb:', imgErr);
        // se falhar, segue usando a URL original do whatsapp mesmo assim
      }
    }

    return res.status(200).json({ nome, imagem });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar dados do link.' });
  }
}