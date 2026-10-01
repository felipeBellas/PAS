/* =========================================================
   PAS-PROVA
   EXECUÇÃO DA AVALIAÇÃO
   ========================================================= */

import { db } from './firebase-config.js';

import {
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


/* =========================================================
   PARÂMETROS
   ========================================================= */

const urlParams =
  new URLSearchParams(
    window.location.search
  );

const codigoProva =
  urlParams.get("codigo");

const tentativaId =
  urlParams.get("tentativa");

const nomeAluno =
  sessionStorage.getItem("aluno_nome")
  ||
  "Aluno Não Identificado";


/* =========================================================
   CHAVE DA TENTATIVA
   ========================================================= */

const chaveSessao =
  codigoProva && tentativaId
    ? `pas_prova_${codigoProva}_${tentativaId}`
    : null;


/* =========================================================
   ESTADO
   ========================================================= */

let dadosProvaAtual = null;

let tempoRestanteSegundos = 0;

let contadorAlertas = 0;

let limiteSaidas = 2;

let intervalId = null;

let horarioFim = null;

let provaIniciada = false;

let provaEncerrada = false;

let monitoramentoIniciado = false;

let paginaFicouOculta = false;


/* =========================================================
   ELEMENTOS
   ========================================================= */

const elInfoAluno =
  document.getElementById(
    "info-aluno"
  );

const btnIniciarProva =
  document.getElementById(
    "btn-iniciar-prova"
  );

const avisoPreparacao =
  document.getElementById(
    "aviso-preparacao"
  );

const elCronometro =
  document.getElementById(
    "cronometro"
  );

const elContadorAlertas =
  document.getElementById(
    "contador-alertas"
  );


if (elInfoAluno) {

  elInfoAluno.innerText =
    `Aluno: ${nomeAluno}`;

}


/* =========================================================
   SESSÃO LOCAL
   ========================================================= */

function carregarSessao() {

  if (!chaveSessao) {
    return null;
  }

  try {

    const dados =
      localStorage.getItem(
        chaveSessao
      );

    if (!dados) {
      return null;
    }

    return JSON.parse(
      dados
    );

  }

  catch (erro) {

    console.error(
      "Erro ao recuperar sessão:",
      erro
    );

    return null;

  }

}


function salvarSessao(
  dadosExtras = {}
) {

  if (!chaveSessao) {
    return;
  }

  const anterior =
    carregarSessao()
    ||
    {};

  const atualizada = {

    ...anterior,

    codigoProva,

    tentativaId,

    aluno:
      nomeAluno,

    horarioFim,

    contadorAlertas,

    iniciada:
      provaIniciada,

    encerrada:
      provaEncerrada,

    ...dadosExtras

  };

  try {

    localStorage.setItem(
      chaveSessao,
      JSON.stringify(
        atualizada
      )
    );

  }

  catch (erro) {

    console.error(
      "Erro ao salvar sessão:",
      erro
    );

  }

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function inicializarProva() {

  if (!codigoProva) {

    alert(
      "Código da prova não fornecido!"
    );

    window.location.href =
      "./index.html";

    return;

  }


  if (!tentativaId) {

    alert(
      "Sessão da avaliação inválida. Entre novamente pelo início."
    );

    window.location.href =
      "./index.html";

    return;

  }


  try {

    /* =====================================================
       LOCALIZAR A PROVA
       ===================================================== */

    const q =
      query(
        collection(
          db,
          "provas"
        ),
        where(
          "codigo",
          "==",
          codigoProva
        )
      );

    const querySnapshot =
      await getDocs(q);


    if (querySnapshot.empty) {

      alert(
        "Prova não encontrada!"
      );

      window.location.href =
        "./index.html";

      return;

    }


    dadosProvaAtual =
      querySnapshot
        .docs[0]
        .data();


    limiteSaidas =
      dadosProvaAtual.limiteSaidas
      ??
      2;


    /* =====================================================
       TÍTULO
       ===================================================== */

    const elTitulo =
      document.getElementById(
        "titulo-exame"
      );

    if (elTitulo) {

      elTitulo.innerText =
        `${dadosProvaAtual.titulo} (${dadosProvaAtual.turma})`;

    }


    /* =====================================================
       RECUPERAR TENTATIVA
       ===================================================== */

    const sessao =
      carregarSessao();


    if (sessao) {

      contadorAlertas =
        Number(
          sessao.contadorAlertas
          ||
          0
        );

      provaIniciada =
        sessao.iniciada === true;

      provaEncerrada =
        sessao.encerrada === true;

      if (sessao.horarioFim) {

        horarioFim =
          Number(
            sessao.horarioFim
          );

      }

    }


    atualizarContadorAlertas();


    /* =====================================================
       TENTATIVA ENCERRADA
       ===================================================== */

    if (provaEncerrada) {

      esconderLoader();

      mostrarProvaEncerrada(

        sessao?.motivoEncerramento
        ||
        "Esta prova já foi encerrada."

      );

      return;

    }


    /* =====================================================
       PROVA JÁ INICIADA
       ===================================================== */

    if (
      provaIniciada
      &&
      horarioFim
    ) {

      /*
        O aluno atualizou a página.

        Não recebe novo tempo.
        Não precisa clicar novamente
        em INICIAR PROVA.
      */

      if (
        calcularTempoRestante() <= 0
      ) {

        esconderLoader();

        encerrarProva(
          "Tempo Esgotado!"
        );

        return;

      }


      carregarGoogleForms();

      esconderLoader();

      esconderModoPreparacao();

      iniciarCronometro();

      iniciarMonitoramentoSessao();

      iniciarProtecoesContraCopia();

      return;

    }


    /* =====================================================
       PRIMEIRA ABERTURA DA TENTATIVA
       ===================================================== */

    provaIniciada = false;

    provaEncerrada = false;

    horarioFim = null;


    salvarSessao({

      criadaEm:
        sessao?.criadaEm
        ||
        new Date().toISOString(),

      iniciada:
        false,

      encerrada:
        false

    });


    /*
      O Forms já é carregado para permitir
      que o aluno faça login no Google.

      MAS o cronômetro ainda NÃO começa.
    */

    carregarGoogleForms();

    esconderLoader();

    mostrarModoPreparacao();

  }

  catch (erro) {

    console.error(
      "Erro ao inicializar prova:",
      erro
    );

    alert(
      "Erro ao carregar a prova: "
      +
      erro.message
    );

  }

}


/* =========================================================
   GOOGLE FORMS
   ========================================================= */

function carregarGoogleForms() {

  const elIframe =
    document.getElementById(
      "iframe-forms"
    );

  if (
    !elIframe
    ||
    !dadosProvaAtual
  ) {
    return;
  }


  const link =
    dadosProvaAtual.linkForms;


  const separador =
    link.includes("?")
      ? "&"
      : "?";


  /*
    Cada tentativa recebe uma URL diferente.
  */

  const urlForms =
    link
    +
    separador
    +
    "pas_tentativa="
    +
    encodeURIComponent(
      tentativaId
    );


  elIframe.src =
    urlForms;

}


/* =========================================================
   MODO DE PREPARAÇÃO
   ========================================================= */

function mostrarModoPreparacao() {

  if (btnIniciarProva) {

    btnIniciarProva.classList.remove(
      "hidden"
    );

  }

  if (avisoPreparacao) {

    avisoPreparacao.classList.remove(
      "hidden"
    );

  }

  if (elCronometro) {

    elCronometro.innerText =
      "--:--";

  }

}


function esconderModoPreparacao() {

  if (btnIniciarProva) {

    btnIniciarProva.classList.add(
      "hidden"
    );

  }

  if (avisoPreparacao) {

    avisoPreparacao.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   CLIQUE EM INICIAR PROVA
   ========================================================= */

if (btnIniciarProva) {

  btnIniciarProva.addEventListener(

    "click",

    () => {

      iniciarTentativa();

    }

  );

}


function iniciarTentativa() {

  /*
    Proteção contra clique duplo.
  */

  if (
    provaIniciada
    ||
    provaEncerrada
  ) {
    return;
  }


  if (!dadosProvaAtual) {
    return;
  }


  const duracaoMinutos =
    Number(
      dadosProvaAtual.duracao
      ||
      50
    );


  /*
    AQUI COMEÇA OFICIALMENTE
    O TEMPO DA PROVA.
  */

  horarioFim =
    Date.now()
    +
    (
      duracaoMinutos
      *
      60
      *
      1000
    );


  provaIniciada =
    true;

  contadorAlertas =
    0;


  salvarSessao({

    iniciada:
      true,

    iniciadaEm:
      new Date()
        .toISOString(),

    encerrada:
      false

  });


  atualizarContadorAlertas();

  esconderModoPreparacao();

  iniciarCronometro();

  iniciarMonitoramentoSessao();

  iniciarProtecoesContraCopia();

}


/* =========================================================
   TEMPO RESTANTE
   ========================================================= */

function calcularTempoRestante() {

  if (!horarioFim) {
    return 0;
  }

  return Math.max(

    0,

    Math.ceil(

      (
        horarioFim
        -
        Date.now()
      )
      /
      1000

    )

  );

}


/* =========================================================
   CRONÔMETRO
   ========================================================= */

function atualizarCronometro() {

  tempoRestanteSegundos =
    calcularTempoRestante();


  const minutos =
    String(
      Math.floor(
        tempoRestanteSegundos
        /
        60
      )
    ).padStart(
      2,
      "0"
    );


  const segundos =
    String(
      tempoRestanteSegundos
      %
      60
    ).padStart(
      2,
      "0"
    );


  if (elCronometro) {

    elCronometro.innerText =
      `${minutos}:${segundos}`;

  }

}


function iniciarCronometro() {

  if (intervalId) {

    clearInterval(
      intervalId
    );

  }


  atualizarCronometro();


  if (
    tempoRestanteSegundos <= 0
  ) {

    encerrarProva(
      "Tempo Esgotado!"
    );

    return;

  }


  intervalId =
    setInterval(

      () => {

        atualizarCronometro();


        if (
          tempoRestanteSegundos <= 0
        ) {

          clearInterval(
            intervalId
          );

          intervalId = null;


          encerrarProva(
            "Tempo Esgotado!"
          );

        }

      },

      1000

    );

}


/* =========================================================
   ALERTAS
   ========================================================= */

function atualizarContadorAlertas() {

  if (elContadorAlertas) {

    elContadorAlertas.innerText =
      contadorAlertas;

  }

}


/* =========================================================
   MONITORAMENTO DE SAÍDA
   ========================================================= */

function iniciarMonitoramentoSessao() {

  if (monitoramentoIniciado) {
    return;
  }


  monitoramentoIniciado =
    true;


  document.addEventListener(

    "visibilitychange",

    () => {

      if (
        !provaIniciada
        ||
        provaEncerrada
      ) {
        return;
      }


      /*
        Ficou oculta.
      */

      if (document.hidden) {

        paginaFicouOculta =
          true;

        return;

      }


      /*
        Voltou a ficar visível.

        Aqui confirmamos uma saída.
      */

      if (paginaFicouOculta) {

        paginaFicouOculta =
          false;

        registrarSaidaDeTela();

      }

    }

  );

}


/* =========================================================
   REGISTRAR SAÍDA
   ========================================================= */

function registrarSaidaDeTela() {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {
    return;
  }


  contadorAlertas++;


  atualizarContadorAlertas();


  salvarSessao();


  salvarLogViolacao(
    "Troca de Aba / Janela Minimizada"
  );


  if (
    contadorAlertas
    >
    limiteSaidas
  ) {

    encerrarProva(
      "Você excedeu o limite máximo de trocas de tela permitido!"
    );

  }

  else {

    alert(
      `ATENÇÃO: Você saiu da tela da prova! Alerta ${contadorAlertas} de ${limiteSaidas}.`
    );

  }

}


/* =========================================================
   PROTEÇÕES CONTRA CÓPIA
   ========================================================= */

function iniciarProtecoesContraCopia() {

  document.addEventListener(

    "contextmenu",

    bloquearMenuContexto

  );


  document.addEventListener(

    "copy",

    bloquearCopia

  );


  document.addEventListener(

    "cut",

    bloquearRecorte

  );


  document.addEventListener(

    "dragstart",

    bloquearArrasto

  );


  document.addEventListener(

    "keydown",

    bloquearAtalhos

  );

}


function bloquearMenuContexto(
  evento
) {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {
    return;
  }

  evento.preventDefault();

  salvarLogViolacao(
    "Tentativa de abrir menu de contexto"
  );

}


function bloquearCopia(
  evento
) {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {
    return;
  }

  evento.preventDefault();

  salvarLogViolacao(
    "Tentativa de copiar conteúdo"
  );

}


function bloquearRecorte(
  evento
) {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {
    return;
  }

  evento.preventDefault();

  salvarLogViolacao(
    "Tentativa de recortar conteúdo"
  );

}


function bloquearArrasto(
  evento
) {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {
    return;
  }

  evento.preventDefault();

}


function bloquearAtalhos(
  evento
) {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {
    return;
  }


  const tecla =
    evento.key
      .toLowerCase();


  const modificador =
    evento.ctrlKey
    ||
    evento.metaKey;


  if (
    modificador
    &&
    [
      "c",
      "x",
      "a",
      "s",
      "p",
      "u"
    ].includes(
      tecla
    )
  ) {

    evento.preventDefault();

    salvarLogViolacao(
      `Atalho bloqueado: ${tecla.toUpperCase()}`
    );

    return;

  }


  if (
    evento.key ===
    "F12"
  ) {

    evento.preventDefault();

    salvarLogViolacao(
      "Tentativa de usar F12"
    );

    return;

  }


  if (
    evento.ctrlKey
    &&
    evento.shiftKey
    &&
    [
      "i",
      "j",
      "c"
    ].includes(
      tecla
    )
  ) {

    evento.preventDefault();

    salvarLogViolacao(
      "Tentativa de usar atalho de inspeção"
    );

  }

}


/* =========================================================
   LOG
   ========================================================= */

async function salvarLogViolacao(
  tipo
) {

  if (
    !provaIniciada
    ||
    provaEncerrada
  ) {
    return;
  }


  try {

    await addDoc(

      collection(
        db,
        "logs_violacao"
      ),

      {

        aluno:
          nomeAluno,

        codigoProva:
          codigoProva,

        tipoViolacao:
          tipo,

        timestamp:
          new Date()
            .toISOString()

      }

    );

  }

  catch (erro) {

    console.error(
      "Erro ao salvar log de violação:",
      erro
    );

  }

}


/* =========================================================
   ENCERRAR PROVA
   ========================================================= */

function encerrarProva(
  motivo
) {

  if (provaEncerrada) {
    return;
  }


  provaEncerrada =
    true;


  if (intervalId) {

    clearInterval(
      intervalId
    );

    intervalId =
      null;

  }


  salvarSessao({

    iniciada:
      true,

    encerrada:
      true,

    motivoEncerramento:
      motivo,

    encerradaEm:
      new Date()
        .toISOString()

  });


  mostrarProvaEncerrada(
    motivo
  );

}


/* =========================================================
   PROVA ENCERRADA
   ========================================================= */

function mostrarProvaEncerrada(
  motivo
) {

  provaEncerrada =
    true;


  esconderModoPreparacao();


  if (elCronometro) {

    elCronometro.innerText =
      "00:00";

  }


  const containerForms =
    document.getElementById(
      "container-forms"
    );


  if (containerForms) {

    containerForms.innerHTML = `

      <div
        class="
          flex
          flex-col
          items-center
          justify-center
          h-full
          min-h-[calc(100vh-65px)]
          p-8
          text-center
          space-y-4
        "
      >

        <h2
          class="
            text-3xl
            font-bold
            text-red-500
          "
        >
          Prova Encerrada
        </h2>


        <p class="text-slate-300">

          ${escapeHtml(
            motivo
          )}

        </p>


        <p
          class="
            text-sm
            text-slate-500
            max-w-md
          "
        >
          Esta tentativa foi finalizada.
          Atualizar a página não reiniciará
          a avaliação.
        </p>


        <a
          href="./index.html"
          class="
            bg-blue-600
            hover:bg-blue-500
            px-6
            py-2
            rounded
            text-white
          "
        >
          Voltar ao Início
        </a>

      </div>

    `;

  }

}


/* =========================================================
   LOADER
   ========================================================= */

function esconderLoader() {

  const loader =
    document.getElementById(
      "loader"
    );


  if (loader) {

    loader.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
  valor
) {

  return String(
    valor ?? ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   INICIAR
   ========================================================= */

inicializarProva();
