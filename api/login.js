export default async function handler(req, res) {
  // Apenas permite que o site envie os dados (evita acessos estranhos)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { password } = req.body;
  
  // process.env.ADMIN_PASSWORD puxa o valor que você salvou no painel da Vercel
  const SENHA_REAL = process.env.ADMIN_PASSWORD;

  // Verifica se a senha enviada pelo seu site bate com a senha guardada na Vercel
  if (password === SENHA_REAL) {
    return res.status(200).json({ success: true, token: "ACESSO_LIBERADO_SOBERANO" });
  } else {
    return res.status(401).json({ success: false, error: 'Senha incorreta' });
  }
}