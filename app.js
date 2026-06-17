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

// INJETAR SETAS DE NAVEGAÇÃO
function injetarSetasCarrossel() {
  const containers = document.querySelectorAll('.carrossel-container');
  containers.forEach((cont, index) => {
    const gridId = cont.querySelector('.groups-grid').id;
    
    // Evita duplicar setas se já existirem
    if (!cont.querySelector('.btn-seta-prev')) {
      cont.insertAdjacentHTML('afterbegin', `<button class="btn-seta btn-seta-prev" onclick="scrollCarrossel('${gridId}', -300)">❮</button>`);
      cont.insertAdjacentHTML('beforeend', `<button class="btn-seta btn-seta-next" onclick="scrollCarrossel('${gridId}', 300)">❯</button>`);
    }
  });
}

function scrollCarrossel(idContainer, direcao) {
  const container = document.getElementById(idContainer);
  if (container) {
    container.scrollBy({ left: direcao, behavior: 'smooth' });
  }
}

// BUSCA OS DADOS DO FIREBASE
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

      Object.values(containers).forEach(cont => { if(cont) cont.innerHTML = ""; });

      if (!dados) {
        document.getElementById("count-total").innerText = "0";
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

      document.getElementById("count-total").innerText = totalContador;
      injetarSetasCarrossel(); // Garante que as setas apareçam após carregar os cards
      verificarStatusPainelAdm();
    })
    .catch(err => console.error("Erro Firebase:", err));
}

// ============================================================================
// 2. ESTATÍSTICAS E DEMAIS LÓGICAS (MANTIDAS)
// ============================================================================
function gerenciarEstatisticasReais() {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const idSessaoUnica = Math.random().toString(36).substring(2, 9);
  
  fetch(`${FIREBASE_URL}/estatisticas/visitas_totais.json`).then(res => res.json()).then(total => {
    let novoTotal = (parseInt(total) || 0) + 1;
    fetch(`${FIREBASE_URL}/estatisticas/visitas_totais.json`, { method: "PUT", body: novoTotal });
    document.getElementById("count-visitas-total").innerText = novoTotal.toLocaleString("pt-BR");
  });

  const refOnline = `${FIREBASE_URL}/online/${idSessaoUnica}.json`;
  fetch(refOnline, { method: "PUT", body: true });
  window.addEventListener("beforeunload", () => fetch(`${FIREBASE_URL}/online/${idSessaoUnica}.json`, { method: "DELETE", keepalive: true }));
}

function inicializarPlayerMusica() {
  const audio = document.getElementById("musicAudio");
  const btnEntrarSite = document.getElementById("btnEntrarSite");
  const introOverlay = document.getElementById("introOverlay");

  btnEntrarSite.onclick = () => {
    introOverlay.classList.add("ocultar");
    audio.play().catch(() => {});
    document.getElementById("playerStatus").innerText = "Tocando";
  };
}

function inicializarPainelControleAdm() {
  const formLogin = document.getElementById("formLoginAdm");
  formLogin.onsubmit = (e) => {
    e.preventDefault();
    if (document.getElementById("campoSenhaAdm").value === SENHA_ADMIN_SECRETA) {
      localStorage.setItem("adm_logado", "true");
      document.getElementById("areaRestritaAdm").style.display = "block";
      formLogin.style.display = "none";
      verificarStatusPainelAdm();
    }
  };

  document.getElementById("formCadastroLink").onsubmit = (e) => {
    e.preventDefault();
    const inputImg = document.getElementById("admImgGrupo");
    const formData = new FormData();
    formData.append("image", inputImg.files[0]);

    fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData })
    .then(res => res.json())
    .then(r => {
      const novoLink = {
        nome: document.getElementById("admNomeGrupo").value,
        link: document.getElementById("admLinkGrupo").value,
        imagem: r.data.url,
        tipo: document.getElementById("admSessaoGrupo").value
      };
      return fetch(`${FIREBASE_URL}/links.json`, { method: "POST", body: JSON.stringify(novoLink) });
    })
    .then(() => { alert("Sucesso!"); carregarLinksDoFirebase(); });
  };
}

function removerLinkDoFirebase(id) {
  if (confirm("Deseja excluir?")) {
    fetch(`${FIREBASE_URL}/links/${id}.json`, { method: "DELETE" }).then(() => carregarLinksDoFirebase());
  }
}

function verificarStatusPainelAdm() {
  if (localStorage.getItem("adm_logado") === "true") {
    document.querySelectorAll(".btn-deletar-card-adm").forEach(b => b.style.display = "block");
    document.getElementById("areaRestritaAdm").style.display = "block";
    document.getElementById("formLoginAdm").style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarLinksDoFirebase();
  gerenciarEstatisticasReais();
  inicializarPlayerMusica();
  inicializarPainelControleAdm();
});