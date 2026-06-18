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
      const containers = {
        "grupo-vip": document.getElementById("gradeVips"),
        "grupo-geral": document.getElementById("gradeNormais"),
        "canal-wa": document.getElementById("gradeCanaisWA"),
        "tg-grupo": document.getElementById("gradeTelegramGrupos"),
        "tg-canal": document.getElementById("gradeTelegramCanais")
      };

      Object.values(containers).forEach(c => { if(c) c.innerHTML = ""; });

      if (!dados) {
        const totalTxt = document.getElementById("count-total");
        if (totalTxt) totalTxt.innerText = "0";
        return;
      }

      let totalContador = 0;
      Object.keys(dados).forEach(id => {
        const item = dados[id];
        if (containers[item.tipo]) {
          containers[item.tipo].innerHTML += criarCardHtml(id, item);
          totalContador++;
        }
      });

      const totalTxt = document.getElementById("count-total");
      if (totalTxt) totalTxt.innerText = totalContador;
      verificarStatusPainelAdm();
    })
    .catch(err => console.error("Erro ao puxar dados do Firebase:", err));
}

// ============================================================================
// 2. SISTEMA DE CONTROLE DE VISITANTES REAIS (CORRIGIDO)
// ============================================================================
function gerenciarEstatisticasReais() {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const idSessaoUnica = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now();

  // MANTEMOS A LÓGICA DE VISITAS IGUAL PARA NÃO QUEBRAR O QUE JÁ FUNCIONA
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

  // SISTEMA ONLINE CORRIGIDO (AUTO-LIMPEZA)
  const refOnline = `${FIREBASE_URL}/online/${idSessaoUnica}.json`;
  
  // Envia sinal de que está online a cada 15 segundos
  const enviarPulso = () => {
    fetch(refOnline, { method: "PUT", body: JSON.stringify({ lastSeen: Date.now() }) });
  };
  
  enviarPulso();
  setInterval(enviarPulso, 15000); 

  // Validação: Conta apenas quem deu sinal nos últimos 60 segundos
  setInterval(() => {
    fetch(`${FIREBASE_URL}/online.json`)
      .then(res => res.json())
      .then(data => {
        if (!data) return;
        const agora = Date.now();
        let ativos = 0;
        
        Object.keys(data).forEach(id => {
          if (agora - data[id].lastSeen > 60000) {
            fetch(`${FIREBASE_URL}/online/${id}.json`, { method: "DELETE" });
          } else {
            ativos++;
          }
        });
        
        const el = document.getElementById("count-online");
        if (el) el.innerText = ativos;
      });
  }, 10000);
}

// ============================================================================
// 3. PLAYER DE ÁUDIO E CONTROLE DE INTRODUÇÃO (VERSÃO COM ANIMAÇÃO)
// ============================================================================
function inicializarPlayerMusica() {
  const audio = document.getElementById("musicAudio");
  const btnDesktop = document.getElementById("musicBtn");
  const btnMobile = document.getElementById("musicBtnMobile");
  const statusTexto = document.getElementById("playerStatus");
  const fabIcon = document.getElementById("fabIcon");
  const disco = document.getElementById("playerDisco"); // O elemento da animação
  const btnEntrar = document.getElementById("btnEntrarSite");
  const intro = document.getElementById("introOverlay");

  const atualizarUI = () => {
    const tocando = !audio.paused;
    
    // Atualiza status de texto
    if (statusTexto) {
      statusTexto.innerText = tocando ? "Tocando" : "Pausado";
      statusTexto.style.color = tocando ? "#00e676" : "";
    }
    
    // Atualiza ícone do botão mobile
    if (fabIcon) fabIcon.innerText = tocando ? "⏸️" : "🎵";

    // Atualiza a animação do espectro (adiciona/remove classe .playing)
    if (disco) {
      if (tocando) {
        disco.classList.add("playing");
      } else {
        disco.classList.remove("playing");
      }
    }
  };

  const toggleAudio = () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  if (btnDesktop) btnDesktop.onclick = toggleAudio;
  if (btnMobile) btnMobile.onclick = toggleAudio;
  
  // Eventos nativos garantem a sincronia total
  audio.onplay = atualizarUI;
  audio.onpause = atualizarUI;

  if (btnEntrar) {
    btnEntrar.onclick = () => {
      intro.classList.add("ocultar");
      audio.play().catch(() => {});
    };
  }
}

// ============================================================================
// 4. ENGINE DO PAINEL ADMINISTRATIVO
// ============================================================================
function inicializarPainelControleAdm() {
  const formLogin = document.getElementById("formLoginAdm");
  const formCadastro = document.getElementById("formCadastroLink");
  const btnPublicar = document.getElementById("btnPublicarLink");

  formLogin?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (document.getElementById("campoSenhaAdm").value === SENHA_ADMIN_SECRETA) {
      localStorage.setItem("adm_logado", "true");
      verificarStatusPainelAdm();
    } else { alert("Senha incorreta!"); }
  });

  formCadastro?.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("image", document.getElementById("admImgGrupo").files[0]);

    btnPublicar.innerText = "ENVIANDO...";
    btnPublicar.disabled = true;

    fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData })
    .then(res => res.json())
    .then(r => {
      const novo = {
        nome: document.getElementById("admNomeGrupo").value,
        link: document.getElementById("admLinkGrupo").value,
        imagem: r.data.url,
        tipo: document.getElementById("admSessaoGrupo").value
      };
      return fetch(`${FIREBASE_URL}/links.json`, { method: "POST", body: JSON.stringify(novo) });
    })
    .then(() => { alert("Sucesso!"); formCadastro.reset(); carregarLinksDoFirebase(); })
    .finally(() => { btnPublicar.innerText = "PUBLICAR NO SITE"; btnPublicar.disabled = false; });
  });
}

function removerLinkDoFirebase(id) {
  if (confirm("Excluir este link?")) {
    fetch(`${FIREBASE_URL}/links/${id}.json`, { method: "DELETE" }).then(() => carregarLinksDoFirebase());
  }
}

function verificarStatusPainelAdm() {
  const logado = localStorage.getItem("adm_logado") === "true";
  document.querySelectorAll(".btn-deletar-card-adm").forEach(b => b.style.display = logado ? "block" : "none");
  const area = document.getElementById("areaRestritaAdm");
  const login = document.getElementById("formLoginAdm");
  if (area) area.style.display = logado ? "block" : "none";
  if (login) login.style.display = logado ? "none" : "block";
}

// ============================================================================
// 5. ENGINE DO SISTEMA DE COMPARTILHAMENTO
// ============================================================================
function inicializarSistemaCompartilhar() {
  const btnTrigger = document.getElementById('btnShareTrigger');
  const menu = document.getElementById('shareMenu');
  btnTrigger?.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('show'); });
  
  const url = window.location.href;
  document.getElementById('shareWA')?.setAttribute('href', `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`);
  document.getElementById('shareTG')?.setAttribute('href', `https://t.me/share/url?url=${encodeURIComponent(url)}`);
  
  document.getElementById('btnCopyLink')?.addEventListener('click', function() {
    navigator.clipboard.writeText(url).then(() => {
      const original = this.innerText;
      this.innerText = "✅ Copiado!";
      setTimeout(() => this.innerText = original, 1500);
    });
  });
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