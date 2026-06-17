// ============================================================================
// 1. CONFIGURAÇÕES GLOBAIS E LINKS DO BANCO DE DADOS
// ============================================================================
const FIREBASE_URL = "https://cybersoberano-default-rtdb.firebaseio.com";
const SENHA_ADMIN_SECRETA = "1234"; // Altere aqui para a senha dos seus adms
const IMGBB_API_KEY = "8bf2a05fe7578df492f6bdb4f10f9925"; // COLE SUA CHAVE DO IMGBB AQUI!

// FUNÇÃO PARA CRIAR CARD HTML
function criarCardHtml(id, item) {
  const isVip = item.tipo === "grupo-vip";
  const tagExibicao = item.tipo.replace("-", " ").toUpperCase();
  return `
    <div class="group-card ${isVip ? 'vip-card' : ''}" data-id="${id}">
      <div class="card-banner">
        <img src="${item.imagem}" alt="${item.nome}" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';">
        ${isVip ? '<span class="card-badge-vip">★ VIP</span>' : ''}
        <span class="card-badge-categoria">${tagExibicao}</span>
      </div>
      <div class="card-corpo">
        <h3 class="card-titulo" title="${item.nome}">${item.nome}</h3>
        <a href="${item.link}" target="_blank" class="card-botao-entrar">
          ${isVip ? 'ACESSAR VIP' : 'ENTRAR NO LINK'}
        </a>
        <button class="btn-deletar-card-adm" onclick="removerLinkDoFirebase('${id}')" style="display:none;">EXCLUIR LINK</button>
      </div>
    </div>
  `;
}

// BUSCA OS DADOS DO FIREBASE EM TEMPO REAL E ATUALIZA A TELA
function carregarLinksDoFirebase() {
  fetch(`${FIREBASE_URL}/links.json`)
    .then(res => res.json())
    .then(dados => {
      const containerVips = document.getElementById("gradeVips");
      const containerNormais = document.getElementById("gradeNormais");
      const containerCanaisWA = document.getElementById("gradeCanaisWA");
      const containerTgGrupos = document.getElementById("gradeTelegramGrupos");
      const containerTgCanais = document.getElementById("gradeTelegramCanais");

      if (containerVips) containerVips.innerHTML = "";
      if (containerNormais) containerNormais.innerHTML = "";
      if (containerCanaisWA) containerCanaisWA.innerHTML = "";
      if (containerTgGrupos) containerTgGrupos.innerHTML = "";
      if (containerTgCanais) containerTgCanais.innerHTML = "";

      if (!dados) {
        const totalTxt = document.getElementById("count-total");
        if (totalTxt) totalTxt.innerText = "0";
        return;
      }

      let totalContador = 0;

      Object.keys(dados).forEach(id => {
        const item = dados[id];
        const cardHtml = criarCardHtml(id, item);
        totalContador++;

        if (item.tipo === "grupo-vip" && containerVips) containerVips.innerHTML += cardHtml;
        else if (item.tipo === "grupo-geral" && containerNormais) containerNormais.innerHTML += cardHtml;
        else if (item.tipo === "canal-wa" && containerCanaisWA) containerCanaisWA.innerHTML += cardHtml;
        else if (item.tipo === "tg-grupo" && containerTgGrupos) containerTgGrupos.innerHTML += cardHtml;
        else if (item.tipo === "tg-canal" && containerTgCanais) containerTgCanais.innerHTML += cardHtml;
      });

      const totalTxt = document.getElementById("count-total");
      if (totalTxt) totalTxt.innerText = totalContador;

      verificarStatusPainelAdm();
    })
    .catch(err => console.error("Erro ao puxar dados do Firebase:", err));
}

// ============================================================================
// 2. SISTEMA DE CONTROLE DE VISITANTES REAIS
// ============================================================================
function gerenciarEstatisticasReais() {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const idSessaoUnica = Math.random().toString(36).substring(2, 9);

  fetch(`${FIREBASE_URL}/estatisticas/visitas_totais.json`)
    .then(res => res.json())
    .then(total => {
      let novoTotal = (parseInt(total) || 0) + 1;
      fetch(`${FIREBASE_URL}/estatisticas/visitas_totais.json`, { method: "PUT", body: novoTotal });
      const el = document.getElementById("count-visitas-total");
      if (el) el.innerText = novoTotal.toLocaleString("pt-BR");
    });

  fetch(`${FIREBASE_URL}/estatisticas/dias/${hojeStr}.json`)
    .then(res => res.json())
    .then(totalDia => {
      let novoTotalDia = (parseInt(totalDia) || 0) + 1;
      fetch(`${FIREBASE_URL}/estatisticas/dias/${hojeStr}.json`, { method: "PUT", body: novoTotalDia });
      const el = document.getElementById("count-visitas-hoje");
      if (el) el.innerText = novoTotalDia.toLocaleString("pt-BR");
    });

  const refOnline = `${FIREBASE_URL}/online/${idSessaoUnica}.json`;
  fetch(refOnline, { method: "PUT", body: true });

  const pingInterval = setInterval(() => {
    fetch(refOnline, { method: "PUT", body: true }).catch(() => clearInterval(pingInterval));
  }, 10000);

  window.addEventListener("beforeunload", () => {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${FIREBASE_URL}/online/${idSessaoUnica}.json?x-http-method-override=DELETE`);
    } else {
      fetch(`${FIREBASE_URL}/online/${idSessaoUnica}.json`, { method: "DELETE", keepalive: true });
    }
  });

  setInterval(() => {
    fetch(`${FIREBASE_URL}/online.json`)
      .then(res => res.json())
      .then(onlineData => {
        const totalOnline = onlineData ? Object.keys(onlineData).length : 1;
        const el = document.getElementById("count-online");
        if (el) el.innerText = totalOnline;
      })
      .catch(err => console.error("Erro ao processar usuários online:", err));
  }, 5000);
}

// ============================================================================
// 3. PLAYER DE ÁUDIO E CONTROLE DE INTRODUÇÃO
// ============================================================================
function inicializarPlayerMusica() {
  const audio = document.getElementById("musicAudio");
  const btnManual = document.getElementById("musicBtn");
  const disco = document.getElementById("playerDisco");
  const statusTexto = document.getElementById("playerStatus");
  
  const introOverlay = document.getElementById("introOverlay");
  const btnEntrarSite = document.getElementById("btnEntrarSite");

  if (!btnEntrarSite || !introOverlay) return;

  function atualizarVisualPlayer(isTocando) {
    if (!disco || !statusTexto) return;
    if (isTocando) {
      disco.classList.add("playing");
      statusTexto.innerText = "Tocando";
      statusTexto.style.color = "#00e676";
    } else {
      disco.classList.remove("playing");
      statusTexto.innerText = "Pausado";
      statusTexto.style.color = "";
    }
  }

  btnEntrarSite.onclick = function() {
    introOverlay.classList.add("ocultar");
    if (audio) {
      audio.play()
        .then(() => atualizarVisualPlayer(true))
        .catch(err => {
          console.log("Áudio bloqueado preliminarmente.", err);
          atualizarVisualPlayer(false);
        });
    }
  };

  if (btnManual && audio) {
    btnManual.onclick = function() {
      if (audio.paused) {
        audio.play().then(() => atualizarVisualPlayer(true)).catch(() => {});
      } else {
        audio.pause();
        atualizarVisualPlayer(false);
      }
    };
  }
}

// ============================================================================
// 4. ENGINE DO PAINEL ADMINISTRATIVO (CONVERTIDO PARA UPLOAD DIRECT IMGBB)
// ============================================================================
function inicializarPainelControleAdm() {
  const formLogin = document.getElementById("formLoginAdm");
  const formCadastro = document.getElementById("formCadastroLink");
  const areaPainel = document.getElementById("areaRestritaAdm");
  const btnPublicar = document.getElementById("btnPublicarLink");

  if (formLogin) {
    formLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      const senhaDigitada = document.getElementById("campoSenhaAdm").value;

      if (senhaDigitada === SENHA_ADMIN_SECRETA) {
        localStorage.setItem("adm_logado", "true");
        if (areaPainel) areaPainel.style.display = "block";
        formLogin.style.display = "none";
        verificarStatusPainelAdm();
        alert("Acesso autorizado! Upload de arquivos e gerenciador ativo.");
      } else {
        alert("Senha incorreta! Tente novamente.");
      }
    });
  }

  if (formCadastro) {
    formCadastro.addEventListener("submit", (e) => {
      e.preventDefault();

      if (localStorage.getItem("adm_logado") !== "true") {
        alert("Sua sessão expirou. Faça login novamente.");
        return;
      }

      if (IMGBB_API_KEY === "SUA_CHAVE_IMGBB_AQUI" || !IMGBB_API_KEY) {
        alert("Erro Técnico: Você precisa inserir sua API KEY do ImgBB no código do app.js para fazer uploads!");
        return;
      }

      const inputArquivo = document.getElementById("admImgGrupo");
      if (!inputArquivo || inputArquivo.files.length === 0) {
        alert("Selecione uma imagem da sua galeria primeiro!");
        return;
      }

      if (btnPublicar) {
        btnPublicar.innerText = "ENVIANDO IMAGEM...";
        btnPublicar.disabled = true;
      }

      const imagemSelecionada = inputArquivo.files[0];
      const formData = new FormData();
      formData.append("image", imagemSelecionada);

      // 1. EFETUA O UPLOAD DA IMAGEM DA GALERIA PARA O SERVIDOR IMGBB
      fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
      })
      .then(res => res.json())
      .then(resultadoUpload => {
        if (!resultadoUpload.success) {
          throw new Error("Falha no servidor ImgBB");
        }

        const linkImagemGerado = resultadoUpload.data.url;

        // 2. CONSTRÓI O OBJETO COM O LINK DA IMAGEM CONVERTIDO E SALVA NO FIREBASE
        const novoLinkItem = {
          nome: document.getElementById("admNomeGrupo").value,
          link: document.getElementById("admLinkGrupo").value,
          imagem: linkImagemGerado,
          tipo: document.getElementById("admSessaoGrupo").value
        };

        return fetch(`${FIREBASE_URL}/links.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(novoLinkItem)
        });
      })
      .then(() => {
        alert("Sucesso absoluto! Imagem hospedada e link publicado com sucesso!");
        formCadastro.reset();
        carregarLinksDoFirebase();
      })
      .catch(err => {
        console.error("Erro no processamento:", err);
        alert("Erro ao fazer o upload da imagem. Certifique-se de que configurou a API Key do ImgBB corretamente.");
      })
      .finally(() => {
        if (btnPublicar) {
          btnPublicar.innerText = "PUBLICAR NO SITE";
          btnPublicar.disabled = false;
        }
      });
    });
  }
}

function removerLinkDoFirebase(id) {
  if (localStorage.getItem("adm_logado") !== "true") return;
  
  if (confirm("Deseja realmente excluir permanentemente este grupo/canal da plataforma?")) {
    fetch(`${FIREBASE_URL}/links/${id}.json`, { method: "DELETE" })
      .then(() => {
        alert("Link deletado da base de dados com sucesso!");
        carregarLinksDoFirebase();
      })
      .catch(err => console.error("Erro ao remover item:", err));
  }
}

function verificarStatusPainelAdm() {
  const botoesDeletar = document.querySelectorAll(".btn-deletar-card-adm");
  const areaPainel = document.getElementById("areaRestritaAdm");
  const formLogin = document.getElementById("formLoginAdm");

  if (localStorage.getItem("adm_logado") === "true") {
    if (areaPainel) areaPainel.style.display = "block";
    if (formLogin) formLogin.style.display = "none";
    botoesDeletar.forEach(btn => btn.style.display = "block");
  } else {
    if (areaPainel) areaPainel.style.display = "none";
    botoesDeletar.forEach(btn => btn.style.display = "none");
  }
}

// ============================================================================
// 5. ENGINE DO SISTEMA DE COMPARTILHAMENTO ATIVO
// ============================================================================
function inicializarSistemaCompartilhar() {
  const btnShareTrigger = document.getElementById('btnShareTrigger');
  const shareMenu = document.getElementById('shareMenu');
  const btnCopyLink = document.getElementById('btnCopyLink');
  const shareWA = document.getElementById('shareWA');
  const shareTG = document.getElementById('shareTG');

  if (!btnShareTrigger || !shareMenu) return;

  btnShareTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    shareMenu.classList.toggle('show');
  });

  const siteUrl = window.location.href;
  const shareText = encodeURIComponent(`🔥 Acesse a Aliança Oficial Los Endemoniados! Todos os nossos grupos e canais em um só lugar:\n\n${siteUrl}`);

  if (shareWA) shareWA.href = `https://api.whatsapp.com/send?text=${shareText}`;
  if (shareTG) shareTG.href = `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent('🔥 Acesse a Aliança Oficial Los Endemoniados!')}`;

  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', () => {
      navigator.clipboard.writeText(siteUrl).then(() => {
        const originalText = btnCopyLink.innerText;
        btnCopyLink.innerText = "✅ Copiado!";
        btnCopyLink.style.color = "#00e676";
        
        setTimeout(() => {
          btnCopyLink.innerText = originalText;
          btnCopyLink.style.color = "";
          shareMenu.classList.remove('show');
        }, 1500);
      }).catch(err => console.error('Erro ao copiar link:', err));
    });
  }

  document.addEventListener('click', () => {
    shareMenu.classList.remove('show');
  });
}

// ============================================================================
// 6. INICIALIZADOR MESTRE DO DOM
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  carregarLinksDoFirebase();
  gerenciarEstatisticasReais();
  inicializarPlayerMusica();
  inicializarPainelControleAdm();
  inicializarSistemaCompartilhar();
});