// ============================================================================
// PÁGINA "ENVIAR GRUPO" — WIZARD DE ENVIO DO VISITANTE (2 ETAPAS)
// Grava em /pendentes.json — o painel admin não é tocado aqui.
// ============================================================================
const FIREBASE_URL = "https://cybersoberano-default-rtdb.firebaseio.com";

let dadosGrupoValidado = { nome: "", imagem: "", link: "" };

function mostrarErro(msg) {
  const el = document.getElementById("mensagemErro");
  el.innerText = msg;
  el.classList.add("mostrar");
}

function esconderErro() {
  const el = document.getElementById("mensagemErro");
  el.classList.remove("mostrar");
  el.innerText = "";
}

function irParaEtapa(numero) {
  document.querySelectorAll(".enviar-etapa").forEach(e => e.classList.remove("ativa"));
  document.getElementById(`etapa${numero}`).classList.add("ativa");

  document.getElementById("stepIndicador1").classList.remove("ativo", "concluido");
  document.getElementById("stepIndicador2").classList.remove("ativo", "concluido");

  if (numero === 1) {
    document.getElementById("stepIndicador1").classList.add("ativo");
  } else {
    document.getElementById("stepIndicador1").classList.add("concluido");
    document.getElementById("stepIndicador2").classList.add("ativo");
  }
}

async function validarLink() {
  const input = document.getElementById("linkGrupoVisitante");
  const link = input.value.trim();
  esconderErro();

  if (!link) {
    mostrarErro("Cole o link do grupo primeiro.");
    return;
  }
  // A categoria "Grupos Parceiros" é exclusiva de WhatsApp no painel,
  // então só aceitamos links chat.whatsapp.com aqui (igual à API).
  if (!link.includes("chat.whatsapp.com")) {
    mostrarErro("Cole um link válido de grupo do WhatsApp (chat.whatsapp.com/...).");
    return;
  }

  const btn = document.getElementById("btnValidarLink");
  btn.disabled = true;
  btn.innerText = "Buscando dados...";

  try {
    const res = await fetch(`/api/whatsapp-meta?link=${encodeURIComponent(link)}`);

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error("Resposta da API não é JSON válido:", parseErr);
      mostrarErro("O servidor demorou demais pra responder. Tente novamente.");
      return;
    }

    if (!res.ok) {
      console.error("API retornou erro:", res.status, data);
      mostrarErro(data.error || `Não foi possível encontrar esse grupo (erro ${res.status}).`);
      return;
    }

    dadosGrupoValidado = {
      nome: data.nome || "Grupo sem nome",
      imagem: data.imagem || "",
      link
    };

    document.getElementById("previewImgVisitante").src =
      dadosGrupoValidado.imagem || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400";
    document.getElementById("previewNomeVisitante").innerText = dadosGrupoValidado.nome;

    irParaEtapa(2);
  } catch (err) {
    console.error("Erro de rede ao chamar /api/whatsapp-meta:", err);
    mostrarErro("Erro ao buscar dados do grupo. Tente novamente.");
  } finally {
    btn.disabled = false;
    btn.innerText = "Validar e continuar";
  }
}

async function enviarGrupoVisitante() {
  const btn = document.getElementById("btnEnviarGrupoVisitante");
  btn.disabled = true;
  btn.innerText = "Enviando...";

  const descricao = document.getElementById("descricaoGrupoVisitante").value.trim();

  const registro = {
    nome: dadosGrupoValidado.nome,
    link: dadosGrupoValidado.link,
    imagem: dadosGrupoValidado.imagem,
    descricao,
    tipo: "grupo-geral", // fixo — visitante só envia pra Parceiros
    status: "pendente",  // aguardando aprovação do admin
    enviadoEm: Date.now()
  };

  try {
    await fetch(`${FIREBASE_URL}/pendentes.json`, {
      method: "POST",
      body: JSON.stringify(registro)
    });

    document.getElementById("etapaFormulario").style.display = "none";
    document.getElementById("etapaSucesso").style.display = "block";
  } catch (err) {
    console.error(err);
    mostrarErro("Erro ao enviar. Tente novamente em instantes.");
  } finally {
    btn.disabled = false;
    btn.innerText = "📤 Enviar para aprovação";
  }
}

function resetarFormulario() {
  document.getElementById("linkGrupoVisitante").value = "";
  document.getElementById("descricaoGrupoVisitante").value = "";
  dadosGrupoValidado = { nome: "", imagem: "", link: "" };
  esconderErro();
  irParaEtapa(1);
  document.getElementById("etapaSucesso").style.display = "none";
  document.getElementById("etapaFormulario").style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnValidarLink").addEventListener("click", validarLink);
  document.getElementById("btnVoltarEtapa1").addEventListener("click", () => irParaEtapa(1));
  document.getElementById("btnEnviarGrupoVisitante").addEventListener("click", enviarGrupoVisitante);
  document.getElementById("btnEnviarOutro").addEventListener("click", resetarFormulario);
});