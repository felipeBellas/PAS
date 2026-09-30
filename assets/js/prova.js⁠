import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const codigoProva = urlParams.get('codigo');
const nomeAluno = sessionStorage.getItem('aluno_nome') || "Aluno Não Identificado";

let tempoRestanteSegundos = 0;
let contadorAlertas = 0;
let limiteSaidas = 2;
let intervalId = null;

const elInfoAluno = document.getElementById('info-aluno');
if (elInfoAluno) {
  elInfoAluno.innerText = `Aluno: ${nomeAluno}`;
}

async function inicializarProva() {
  if (!codigoProva) {
    alert("Código da prova não fornecido!");
    window.location.href = "./index.html";
    return;
  }

  try {
    const q = query(collection(db, "provas"), where("codigo", "==", codigoProva));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("Prova não encontrada!");
      window.location.href = "./index.html";
      return;
    }

    const dadosProva = querySnapshot.docs[0].data();
    
    const elTitulo = document.getElementById('titulo-exame');
    const elIframe = document.getElementById('iframe-forms');
    const elLoader = document.getElementById('loader');

    if (elTitulo) elTitulo.innerText = `${dadosProva.titulo} (${dadosProva.turma})`;
    if (elIframe) elIframe.src = dadosProva.linkForms;
    if (elLoader) elLoader.classList.add('hidden');

    limiteSaidas = dadosProva.limiteSaidas ?? 2;
    tempoRestanteSegundos = (dadosProva.duracao || 50) * 60;

    iniciarCronometro();
    iniciarMonitoramentoSessao();
  } catch (err) {
    console.error("Erro ao inicializar prova:", err);
    alert("Erro ao carregar a prova: " + err.message);
  }
}

function iniciarCronometro() {
  const elCronometro = document.getElementById('cronometro');

  intervalId = setInterval(() => {
    if (tempoRestanteSegundos <= 0) {
      clearInterval(intervalId);
      encerrarProva("Tempo Esgotado!");
      return;
    }

    tempoRestanteSegundos--;
    const min = String(Math.floor(tempoRestanteSegundos / 60)).padStart(2, '0');
    const seg = String(tempoRestanteSegundos % 60).padStart(2, '0');
    if (elCronometro) elCronometro.innerText = `${min}:${seg}`;
  }, 1000);
}

function iniciarMonitoramentoSessao() {
  // Detector de mudança de aba ou minimização
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      contadorAlertas++;
      const elAlertas = document.getElementById('contador-alertas');
      if (elAlertas) elAlertas.innerText = contadorAlertas;
      
      salvarLogViolacao("Troca de Aba / Janela Minimizada");

      if (contadorAlertas > limiteSaidas) {
        encerrarProva("Você excedeu o limite máximo de trocas de tela permitido!");
      } else {
        alert(`ATENÇÃO: Você saiu da tela da prova! Alerta ${contadorAlertas} de ${limiteSaidas}.`);
      }
    }
  });

  // Bloqueio do menu de contexto (Botão direito)
  document.addEventListener('contextmenu', e => e.preventDefault());
}

async function salvarLogViolacao(tipo) {
  try {
    await addDoc(collection(db, "logs_violacao"), {
      aluno: nomeAluno,
      codigoProva: codigoProva,
      tipoViolacao: tipo,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Erro ao salvar log de violação:", err);
  }
}

function encerrarProva(motivo) {
  if (intervalId) clearInterval(intervalId);

  const containerForms = document.getElementById('container-forms');
  if (containerForms) {
    containerForms.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <h2 class="text-3xl font-bold text-red-500">Prova Encerrada</h2>
        <p class="text-slate-300">${motivo}</p>
        <a href="./index.html" class="bg-blue-600 px-6 py-2 rounded text-white">Voltar ao Início</a>
      </div>
    `;
  }
}

inicializarProva();
