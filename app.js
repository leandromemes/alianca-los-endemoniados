// ============================================================================
// 1. CONFIGURAÇÕES GLOBAIS E LINKS DO BANCO DE DADOS
// ============================================================================
const FIREBASE_URL = "https://cybersoberano-default-rtdb.firebaseio.com";
const SENHA_ADMIN_SECRETA = "01234"; 
const IMGBB_API_KEY = "8bf2a05fe7578df492f6bdb4f10f9925"; 

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
// 3. PLAYER DE ÁUDIO E CONTROLE DE INTRODUÇÃO (ATUALIZADO)
// ============================================================================
function inicializarPlayerMusica() {
  const audio = document.getElementById("musicAudio");
  const btnManual = document.getElementById("musicBtn");
  const btnMobile = document.getElementById("musicBtnMobile");
  const disco = document.getElementById("playerDisco");
  const statusTexto = document.getElementById("playerStatus");
  const fabIcon = document.getElementById("fabIcon");
  const introOverlay = document.getElementById("introOverlay");
  const btnEntrarSite = document.getElementById("btnEntrarSite");

  if (!btnEntrarSite || !introOverlay) return;

  function atualizarVisualPlayer(isTocando) {
    if (disco && statusTexto) {
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
    if (btnMobile) {
      if (isTocando) {
        btnMobile.classList.add("playing");
        if (fabIcon) fabIcon.innerText = "⏸️"; 
      } else {
        btnMobile.classList.remove("playing");
        if (fabIcon) fabIcon.innerText = "🎵";
      }
    }
  }

  btnEntrarSite.onclick = function() {
    introOverlay.classList.add("ocultar");
    if (audio) {
      audio.play()
        .then(() => atualizarVisualPlayer(true))
        .catch(err => {
          console.log("Áudio bloqueado:", err);
          atualizarVisualPlayer(false);
        });
    }
  };

  const togglePlay = () => {
    if (audio.paused) {
      audio.play().then(() => atualizarVisualPlayer(true)).catch(() => {});
    } else {
      audio.pause();
      atualizarVisualPlayer(false);
    }
  };

  if (btnManual) btnManual.onclick = togglePlay;
  if (btnMobile) btnMobile.onclick = togglePlay;
}

// ============================================================================
// 4. ENGINE DO PAINEL ADMINISTRATIVO
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
        alert("Acesso autorizado!");
      } else {
        alert("Senha incorreta!");
      }
    });
  }

  if (formCadastro) {
    formCadastro.addEventListener("submit", (e) => {
      e.preventDefault();
      if (localStorage.getItem("adm_logado") !== "true") return;

      const inputArquivo = document.getElementById("admImgGrupo");
      const imagemSelecionada = inputArquivo.files[0];
      const formData = new FormData();
      formData.append("image", imagemSelecionada);

      btnPublicar.innerText = "ENVIANDO...";
      btnPublicar.disabled = true;

      fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData })
      .then(res => res.json())
      .then(resultadoUpload => {
        const novoLinkItem = {
          nome: document.getElementById("admNomeGrupo").value,
          link: document.getElementById("admLinkGrupo").value,
          imagem: resultadoUpload.data.url,
          tipo: document.getElementById("admSessaoGrupo").value
        };
        return fetch(`${FIREBASE_URL}/links.json`, { method: "POST", body: JSON.stringify(novoLinkItem) });
      })
      .then(() => {
        alert("Sucesso!");
        formCadastro.reset();
        carregarLinksDoFirebase();
      })
      .catch(err => { alert("Erro no envio."); console.error(err); })
      .finally(() => { btnPublicar.innerText = "PUBLICAR NO SITE"; btnPublicar.disabled = false; });
    });
  }
}

function removerLinkDoFirebase(id) {
  if (confirm("Deseja excluir?")) {
    fetch(`${FIREBASE_URL}/links/${id}.json`, { method: "DELETE" })
      .then(() => carregarLinksDoFirebase());
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
  }
}

// ============================================================================
// 5. ENGINE DO SISTEMA DE COMPARTILHAMENTO ATIVO
// ============================================================================
function inicializarSistemaCompartilhar() {
  const btnShareTrigger = document.getElementById('btnShareTrigger');
  const shareMenu = document.getElementById('shareMenu');
  const btnCopyLink = document.getElementById('btnCopyLink');
  
  if (btnShareTrigger) {
    btnShareTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      shareMenu.classList.toggle('show');
    });
  }

  const siteUrl = window.location.href;
  if (document.getElementById('shareWA')) document.getElementById('shareWA').href = `https://api.whatsapp.com/send?text=${encodeURIComponent(siteUrl)}`;
  if (document.getElementById('shareTG')) document.getElementById('shareTG').href = `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}`;

  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', () => {
      navigator.clipboard.writeText(siteUrl).then(() => {
        btnCopyLink.innerText = "✅ Copiado!";
        setTimeout(() => btnCopyLink.innerText = "📋 Copiar Link", 1500);
      });
    });
  }
}

// ============================================================================
// 6. INICIALIZADOR MESTRE
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  carregarLinksDoFirebase();
  gerenciarEstatisticasReais();
  inicializarPlayerMusica();
  inicializarPainelControleAdm();
  inicializarSistemaCompartilhar();
});