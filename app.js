// ============================================================================
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
        <img src="${item.imagem}" alt="${item.nome}" draggable="false" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';">
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

      // Monta o HTML de cada seção inteiro numa string antes de tocar no DOM
      // (evita repaint/reflow repetido a cada card, que é bem mais pesado
      // no celular do que montar tudo de uma vez e inserir no final).
      const buffers = {};
      Object.keys(containers).forEach(tipo => { buffers[tipo] = ""; });

      let totalContador = 0;
      if (dados) {
        Object.keys(dados).forEach(id => {
          const item = dados[id];
          if (buffers[item.tipo] !== undefined) {
            buffers[item.tipo] += criarCardHtml(id, item);
            totalContador++;
          }
        });
      }

      Object.keys(containers).forEach(tipo => {
        const el = containers[tipo];
        if (el) el.innerHTML = buffers[tipo];
      });

      const totalTxt = document.getElementById("count-total");
      if (totalTxt) totalTxt.innerText = totalContador;

      verificarStatusPainelAdm();
      // Recalcula as setas do carrossel agora que os cards foram inseridos
      atualizarTodosCarrosseis();

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
// 4. ENGINE DO PAINEL ADMINISTRATIVO
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

  // ---- BOTÃO "BUSCAR" (puxa nome e imagem automaticamente pelo link) ----
  const btnBuscar = document.getElementById("btnBuscarDados");
  btnBuscar?.addEventListener("click", async () => {
    const link = document.getElementById("admLinkGrupo").value.trim();
    if (!link) { alert("Cole o link do grupo primeiro."); return; }

    btnBuscar.disabled = true;
    btnBuscar.innerText = "Buscando...";

    try {
      const res = await fetch(`/api/whatsapp-meta?link=${encodeURIComponent(link)}`);
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Não foi possível buscar os dados."); return; }

      document.getElementById("admNomeGrupo").value = data.nome || "";
      document.getElementById("admImgGrupoUrl").value = data.imagem || "";

      const preview = document.getElementById("previewBuscaGrupo");
      if (data.imagem && preview) {
        document.getElementById("previewImgGrupo").src = data.imagem;
        document.getElementById("previewNomeGrupo").innerText = data.nome;
        preview.style.display = "block";
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar dados do grupo.");
    } finally {
      btnBuscar.disabled = false;
      btnBuscar.innerText = "🔍 Buscar";
    }
  });

  // ---- PUBLICAR (usa imagem buscada automaticamente OU upload manual) ----
  formCadastro?.addEventListener("submit", (e) => {
    e.preventDefault();
    const arquivoImagem = document.getElementById("admImgGrupo").files[0];
    const imagemUrlAutomatica = document.getElementById("admImgGrupoUrl").value;

    btnPublicar.innerText = "ENVIANDO...";
    btnPublicar.disabled = true;

    const publicar = (urlImagemFinal) => {
      const novo = {
        nome: document.getElementById("admNomeGrupo").value,
        link: document.getElementById("admLinkGrupo").value,
        imagem: urlImagemFinal,
        tipo: document.getElementById("admSessaoGrupo").value
      };
      return fetch(`${FIREBASE_URL}/links.json`, { method: "POST", body: JSON.stringify(novo) })
        .then(res => res.json())
        .then(data => {
          localStorage.setItem("idParaAnimar", data.name);

          formCadastro.reset();
          document.getElementById("admImgGrupoUrl").value = "";
          const preview = document.getElementById("previewBuscaGrupo");
          if (preview) preview.style.display = "none";
          const modal = document.getElementById("modalAdmin");
          if (modal) modal.style.display = "none";

          carregarLinksDoFirebase();
        });
    };

    if (arquivoImagem) {
      const formData = new FormData();
      formData.append("image", arquivoImagem);
      fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData })
        .then(res => res.json())
        .then(r => publicar(r.data.url))
        .catch(err => {
          console.error(err);
          alert("Erro ao publicar: " + err);
        })
        .finally(() => {
          btnPublicar.innerText = "PUBLICAR NO SITE";
          btnPublicar.disabled = false;
        });
    } else if (imagemUrlAutomatica) {
      publicar(imagemUrlAutomatica)
        .catch(err => {
          console.error(err);
          alert("Erro ao publicar: " + err);
        })
        .finally(() => {
          btnPublicar.innerText = "PUBLICAR NO SITE";
          btnPublicar.disabled = false;
        });
    } else {
      alert("Cole o link e clique em Buscar, ou selecione uma imagem manualmente.");
      btnPublicar.innerText = "PUBLICAR NO SITE";
      btnPublicar.disabled = false;
    }
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

// Fecha o dropdown de compartilhar ao clicar fora dele
document.addEventListener("click", (e) => {
  const menu = document.getElementById('shareMenu');
  const trigger = document.getElementById('btnShareTrigger');
  if (menu && menu.classList.contains('show') && !menu.contains(e.target) && e.target !== trigger) {
    menu.classList.remove('show');
  }
});

// ============================================================================
// 6. ENGINE DO CARROSSEL — SÓ SETAS + SCROLL NATIVO
// ============================================================================
// Removido de propósito: o "arrastar com o clique do mouse" (mousedown/
// mousemove/mouseup) e o cursor grab/grabbing que vinham junto. Era esse
// sistema que transformava o ponteiro em mãozinha ao passar por cima do
// carrossel e que brigava com o scroll normal da página. Agora o carrossel
// se comporta como qualquer lista horizontal padrão da web: scroll nativo
// (trackpad, barra de rolagem, touch no celular) + botões de seta para
// quem usa mouse comum sem trackpad/scroll horizontal.
let atualizadoresCarrossel = [];

function inicializarSetasCarrossel() {
  atualizadoresCarrossel = []; // zera caso essa função rode mais de uma vez

  document.querySelectorAll(".carrossel-container").forEach((container) => {
    if (container.parentElement.classList.contains("carrossel-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "carrossel-wrapper";
    container.parentNode.insertBefore(wrapper, container);
    wrapper.appendChild(container);

    const btnEsq = document.createElement("button");
    btnEsq.type = "button";
    btnEsq.className = "seta-carrossel seta-esquerda";
    btnEsq.innerHTML = "&#10094;";
    btnEsq.setAttribute("aria-label", "Ver grupos anteriores");

    const btnDir = document.createElement("button");
    btnDir.type = "button";
    btnDir.className = "seta-carrossel seta-direita";
    btnDir.innerHTML = "&#10095;";
    btnDir.setAttribute("aria-label", "Ver mais grupos");

    wrapper.appendChild(btnEsq);
    wrapper.appendChild(btnDir);

    const QUANTIDADE_ROLAGEM = 480;

    btnEsq.addEventListener("click", () => {
      container.scrollBy({ left: -QUANTIDADE_ROLAGEM, behavior: "smooth" });
    });
    btnDir.addEventListener("click", () => {
      container.scrollBy({ left: QUANTIDADE_ROLAGEM, behavior: "smooth" });
    });

    container.querySelectorAll("img").forEach(img => img.setAttribute("draggable", "false"));

    // Habilita/desabilita e esconde as setas conforme a posição da rolagem
    // e só as mostra quando existe overflow real (algo pra rolar).
    const atualizarSetas = () => {
      const temOverflow = container.scrollWidth > container.clientWidth + 5;
      wrapper.classList.toggle("sem-overflow", !temOverflow);
      if (!temOverflow) return;

      const maxScroll = container.scrollWidth - container.clientWidth - 2;
      btnEsq.classList.toggle("seta-desabilitada", container.scrollLeft <= 0);
      btnDir.classList.toggle("seta-desabilitada", container.scrollLeft >= maxScroll);
    };

    container.addEventListener("scroll", atualizarSetas, { passive: true });
    window.addEventListener("resize", atualizarSetas);
    atualizadoresCarrossel.push(atualizarSetas);
  });
}

// Chama a atualização de todas as setas (usado após os cards carregarem do Firebase)
function atualizarTodosCarrosseis() {
  atualizadoresCarrossel.forEach((fn) => fn());
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarSetasCarrossel();
  carregarLinksDoFirebase();
  gerenciarEstatisticasReais();
  inicializarPlayerMusica();
  inicializarPainelControleAdm();
  inicializarSistemaCompartilhar();
});