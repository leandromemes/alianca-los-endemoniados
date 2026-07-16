/// ============================================================================
// 1. CONFIGURAÇÕES GLOBAIS E LINKS DO BANCO DE DADOS
// ============================================================================
const FIREBASE_URL = "https://cybersoberano-default-rtdb.firebaseio.com";
const IMGBB_API_KEY = "8bf2a05fe7578df492f6bdb4f10f9925"; 

// FUNÇÃO PARA CRIAR CARD HTML
function criarCardHtml(id, item) {
  const isVip = item.tipo === "grupo-vip";
  const tagExibicao = item.tipo.replace("-", " ").toUpperCase();
  const logado = localStorage.getItem("adm_logado") === "true";

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
        <button class="btn-deletar-card-adm" onclick="removerLinkDoFirebase('${id}')" style="display:${logado ? 'block' : 'none'};">EXCLUIR LINK</button>
      </div>
    </div>
  `;
}

// BUSCA OS DADOS DO FIREBASE E APLICA ANIMAÇÃO DE NOVO GRUPO
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

      // LÓGICA DA ANIMAÇÃO APÓS CARREGAR
      const idParaAnimar = localStorage.getItem("idParaAnimar");
      if (idParaAnimar) {
        const card = document.querySelector(`[data-id="${idParaAnimar}"]`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("novo-grupo-destaque");
          setTimeout(() => card.classList.remove("novo-grupo-destaque"), 4000);
        }
        localStorage.removeItem("idParaAnimar");
      }
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
  const enviarPulso = () => { fetch(refOnline, { method: "PUT", body: JSON.stringify({ lastSeen: Date.now() }) }); };
  enviarPulso();
  setInterval(enviarPulso, 15000); 

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
          } else { ativos++; }
        });
        const el = document.getElementById("count-online");
        if (el) el.innerText = ativos;
      });
  }, 10000);
}

// ============================================================================
// 3. PLAYER DE ÁUDIO
// ============================================================================
function inicializarPlayerMusica() {
  const audio = document.getElementById("musicAudio");
  const btnDesktop = document.getElementById("musicBtn");
  const btnMobile = document.getElementById("musicBtnMobile");
  const statusTexto = document.getElementById("playerStatus");
  const fabIcon = document.getElementById("fabIcon");
  const disco = document.getElementById("playerDisco");
  const btnEntrar = document.getElementById("btnEntrarSite");
  const intro = document.getElementById("introOverlay");

  const atualizarUI = () => {
    const tocando = !audio.paused;
    if (statusTexto) {
      statusTexto.innerText = tocando ? "Tocando" : "Pausado";
      statusTexto.style.color = tocando ? "#00e676" : "";
    }
    if (fabIcon) fabIcon.innerText = tocando ? "⏸️" : "🎵";
    if (disco) tocando ? disco.classList.add("playing") : disco.classList.remove("playing");
  };

  const toggleAudio = () => {
    if (audio.paused) { audio.play().catch(() => {}); } else { audio.pause(); }
  };

  if (btnDesktop) btnDesktop.onclick = toggleAudio;
  if (btnMobile) btnMobile.onclick = toggleAudio;
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
// 4. ENGINE DO PAINEL ADMINISTRATIVO (COMPLETA E CORRIGIDA)
// ============================================================================
function inicializarPainelControleAdm() {
  const formLogin = document.getElementById("formLoginAdm");
  const formCadastro = document.getElementById("formCadastroLink");
  const btnPublicar = document.getElementById("btnPublicarLink");

formLogin?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const senhaDigitada = document.getElementById("campoSenhaAdm").value;
  const btnEntrar = formLogin.querySelector("button[type='submit']");

  if (btnEntrar) { btnEntrar.disabled = true; btnEntrar.innerText = "Verificando…"; }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: senhaDigitada })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("adm_logado", "true");
      verificarStatusPainelAdm();
      formLogin.reset();
    } else {
      alert("Senha incorreta!");
    }
  } catch (err) {
    console.error(err);
    alert("Erro ao verificar senha. Tente novamente.");
  } finally {
    if (btnEntrar) { btnEntrar.disabled = false; btnEntrar.innerText = "Entrar"; }
  }
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
    .then(res => res.json())
    .then(data => {
      // Salva o ID para a animação ocorrer após o carregamento
      localStorage.setItem("idParaAnimar", data.name);
      
      // Fecha o modal e limpa o form sem recarregar a página
      formCadastro.reset();
      const modal = document.getElementById("modalAdmin");
      if (modal) modal.style.display = "none";
      
      // Recarrega os dados e aplica a animação instantaneamente
      carregarLinksDoFirebase();
    })
    .catch(err => { 
        console.error(err);
        alert("Erro ao publicar: " + err); 
    })
    .finally(() => { 
        btnPublicar.innerText = "PUBLICAR NO SITE"; 
        btnPublicar.disabled = false; 
    });
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

document.addEventListener("DOMContentLoaded", () => {
  carregarLinksDoFirebase();
  gerenciarEstatisticasReais();
  inicializarPlayerMusica();
  inicializarPainelControleAdm();
  inicializarSistemaCompartilhar();
});