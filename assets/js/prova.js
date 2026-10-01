/* =========================================================
   PAS-PROVA
   EXECUÇÃO DA AVALIAÇÃO

   CONTROLA:
   - tentativa individual
   - preparação
   - bloqueio inicial
   - cronômetro persistente
   - atualização da página
   - alertas
   - monitoramento
   - encerramento
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
  urlParams.get(
    "codigo"
  );


const tentativaId =
  urlParams.get(
    "tentativa"
  );


const nomeAluno =
  sessionStorage.getItem(
    "aluno_nome"
  )
  ||
  "Aluno Não Identificado";


/* =========================================================
   CHAVE DA SESSÃO
   ========================================================= */

const chaveSessao =
  codigoProva && tentativaId

    ? `pas_prova_${codigoProva}_${tentativaId}`

    : null;


/* =========================================================
   ESTADO
   ========================================================= */

let dadosProvaAtual =
  null;


let tempoRestanteSegundos =
  0;


let contadorAlertas =
  0;


let limiteSaidas =
  2;


let intervalId =
  null;


let horarioFim =
  null;


let provaIniciada =
  false;


let provaEncerrada =
  false;


let monitoramentoIniciado =
  false;


let protecoesIniciadas =
  false;


let paginaFicouOculta =
  false;


/* =========================================================
   ELEMENTOS
   ========================================================= */

const elInfoAluno =
  document.getElementById(
    "info-aluno"
  );


const elTitulo =
  document.getElementById(
    "titulo-exame"
  );


const elCronometro =
  document.getElementById(
    "cronometro"
  );


const elContadorAlertas =
  document.getElementById(
    "contador-alertas"
  );


const elIframe =
  document.getElementById(
    "iframe-forms"
  );


const elLoader =
  document.getElementById(
    "loader"
  );


const bloqueioPreparacao =
  document.getElementById(
    "bloqueio-preparacao"
  );


const btnIniciarProva =
  document.getElementById(
    "btn-iniciar-prova"
  );


/* =========================================================
   MOSTRAR ALUNO
   ========================================================= */

if (elInfoAluno) {

  elInfoAluno.innerText =
    `Aluno: ${nomeAluno}`;

}


/* =========================================================
   LOCAL STORAGE
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


/* =========================================================
   SALVAR SESSÃO
   ========================================================= */

function salvarSessao(
  dadosExtras = {}
) {

  if (!chaveSessao) {

    return;

  }


  const sessaoAnterior =
    carregarSessao()
    ||
    {};


  const sessaoAtualizada = {

    ...sessaoAnterior,

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
        sessaoAtualizada
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
   INICIALIZAR
   ========================================================= */

async function inicializarProva() {


  /* =======================================================
     VALIDAR CÓDIGO
     ======================================================= */

  if (!codigoProva) {

    alert(
      "Código da prova não fornecido."
    );


    window.location.href =
      "./index.html";


    return;

  }


  /* =======================================================
     VALIDAR TENTATIVA
     ======================================================= */

  if (!tentativaId) {

    alert(
      "Sessão inválida. Entre novamente pelo início."
    );


    window.location.href =
      "./index.html";


    return;

  }


  try {


    /* =====================================================
       LOCALIZAR PROVA NO FIRESTORE
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
      await getDocs(
        q
      );


    /* =====================================================
       PROVA NÃO ENCONTRADA
       ===================================================== */

    if (
      querySnapshot.empty
    ) {

      alert(
        "Prova não encontrada."
      );


      window.location.href =
        "./index.html";


      return;

    }


    /* =====================================================
       DADOS DA PROVA
       ===================================================== */

    dadosProvaAtual =
      querySnapshot
        .docs[0]
        .data();


    limiteSaidas =
      Number(
        dadosProvaAtual.limiteSaidas
        ??
        2
      );


    /* =====================================================
       TÍTULO
       ===================================================== */

    if (elTitulo) {

      elTitulo.innerText =
        `${dadosProvaAtual.titulo} (${dadosProvaAtual.turma})`;

    }


    /* =====================================================
       RECUPERAR SESSÃO
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


      if (
        sessao.horarioFim
      ) {

        horarioFim =
          Number(
            sessao.horarioFim
          );

      }

    }


    atualizarContadorAlertas();


    /* =====================================================
       PROVA JÁ ENCERRADA
       ===================================================== */

    if (
      provaEncerrada
    ) {

      esconderLoader();


      esconderBloqueioPreparacao();


      mostrarProvaEncerrada(

        sessao?.motivoEncerramento
        ||
        "Esta prova já foi encerrada."

      );


      return;

    }


    /* =====================================================
       PROVA JÁ FOI INICIADA
       ===================================================== */

    if (
      provaIniciada
      &&
      horarioFim
    ) {


      /*
       * Atualização da página.
       *
       * A prova continua usando o mesmo
       * horário final.
       */


      if (
        calcularTempoRestante()
        <=
        0
      ) {

        esconderLoader();


        esconderBloqueioPreparacao();


        encerrarProva(
          "Tempo Esgotado!"
        );


        return;

      }


      /*
       * Carrega novamente o Forms,
       * mas NÃO cria nova tentativa.
       */

      carregarGoogleForms();


      esconderLoader();


      esconderBloqueioPreparacao();


      iniciarCronometro();


      iniciarMonitoramentoSessao();


      iniciarProtecoesContraCopia();


      return;

    }


    /* =====================================================
       NOVA TENTATIVA
       ===================================================== */


    provaIniciada =
      false;


    provaEncerrada =
      false;


    horarioFim =
      null;


    contadorAlertas =
      0;


    atualizarContadorAlertas();


    salvarSessao({

      criadaEm:
        sessao?.criadaEm
        ||
        new Date()
          .toISOString(),

      iniciada:
        false,

      encerrada:
        false

    });


    /* =====================================================
       CARREGAR FORMULÁRIO ATRÁS DA CAMADA
       ===================================================== */

    carregarGoogleForms();


    esconderLoader();


    mostrarBloqueioPreparacao();


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

  if (
    !elIframe
    ||
    !dadosProvaAtual
  ) {

    return;

  }


  const link =
    dadosProvaAtual.linkForms;


  if (!link) {

    console.error(
      "Link do Google Forms não encontrado."
    );


    return;

  }


  const separador =
    link.includes("?")
      ? "&"
      : "?";


  /*
   * Cada tentativa recebe um parâmetro
   * diferente.
   *
   * Isso força uma nova navegação do iframe.
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
   BLOQUEIO DE PREPARAÇÃO
   ========================================================= */

function mostrarBloqueioPreparacao() {

  if (
    bloqueioPreparacao
  ) {

    bloqueioPreparacao
      .classList
      .remove(
        "hidden"
      );

  }


  if (
    elCronometro
  ) {

    elCronometro.innerText =
      "--:--";

  }

}


/* =========================================================
   ESCONDER BLOQUEIO
   ========================================================= */

function esconderBloqueioPreparacao() {

  if (
    bloqueioPreparacao
  ) {

    bloqueioPreparacao
      .classList
      .add(
        "hidden"
      );

  }

}


/* =========================================================
   BOTÃO INICIAR
   ========================================================= */

if (
  btnIniciarProva
) {

  btnIniciarProva.addEventListener(

    "click",

    () => {

      iniciarTentativa();

    }

  );

}


/* =========================================================
   INICIAR TENTATIVA
   ========================================================= */

function iniciarTentativa() {


  /*
   * Evita clique duplo.
   */

  if (
    provaIniciada
    ||
    provaEncerrada
  ) {

    return;

  }


  if (
    !dadosProvaAtual
  ) {

    return;

  }


  /*
   * Desabilita imediatamente o botão.
   */

  if (
    btnIniciarProva
  ) {

    btnIniciarProva.disabled =
      true;


    btnIniciarProva.innerText =
      "INICIANDO...";

  }


  /* =======================================================
     DURAÇÃO
     ======================================================= */

  const duracaoMinutos =
    Number(
      dadosProvaAtual.duracao
      ||
      50
    );


  /* =======================================================
     HORÁRIO FINAL
     ======================================================= */

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


  /* =======================================================
     MARCAR COMO INICIADA
     ======================================================= */

  provaIniciada =
    true;


  contadorAlertas =
    0;


  /* =======================================================
     SALVAR ANTES DE LIBERAR O FORMULÁRIO
     ======================================================= */

  salvarSessao({

    iniciada:
      true,

    iniciadaEm:
      new Date()
        .toISOString(),

    encerrada:
      false

  });


  /* =======================================================
     ATUALIZAR INTERFACE
     ======================================================= */

  atualizarContadorAlertas();


  atualizarCronometro();


  /* =======================================================
     REMOVER CAMADA
     ======================================================= */

  esconderBloqueioPreparacao();


  /* =======================================================
     INICIAR SISTEMAS
     ======================================================= */

  iniciarCronometro();


  iniciarMonitoramentoSessao();


  iniciarProtecoesContraCopia();

}


/* =========================================================
   CALCULAR TEMPO
   ========================================================= */

function calcularTempoRestante() {

  if (
    !horarioFim
  ) {

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
   ATUALIZAR CRONÔMETRO
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


  if (
    elCronometro
  ) {

    elCronometro.innerText =
      `${minutos}:${segundos}`;

  }

}


/* =========================================================
   INICIAR CRONÔMETRO
   ========================================================= */

function iniciarCronometro() {


  if (
    intervalId
  ) {

    clearInterval(
      intervalId
    );

  }


  atualizarCronometro();


  if (
    tempoRestanteSegundos
    <=
    0
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
          tempoRestanteSegundos
          <=
          0
        ) {

          clearInterval(
            intervalId
          );


          intervalId =
            null;


          encerrarProva(
            "Tempo Esgotado!"
          );

        }

      },

      1000

    );

}


/* =========================================================
   CONTADOR DE ALERTAS
   ========================================================= */

function atualizarContadorAlertas() {

  if (
    elContadorAlertas
  ) {

    elContadorAlertas.innerText =
      contadorAlertas;

  }

}


/* =========================================================
   MONITORAMENTO
   ========================================================= */

function iniciarMonitoramentoSessao() {


  if (
    monitoramentoIniciado
  ) {

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


      /* ===============================================
         PÁGINA FICOU OCULTA
         =============================================== */

      if (
        document.hidden
      ) {

        paginaFicouOculta =
          true;


        return;

      }


      /* ===============================================
         VOLTOU A FICAR VISÍVEL
         =============================================== */

      if (
        paginaFicouOculta
      ) {

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
   PROTEÇÕES
   ========================================================= */

function iniciarProtecoesContraCopia() {


  if (
    protecoesIniciadas
  ) {

    return;

  }


  protecoesIniciadas =
    true;


  /* =======================================================
     MENU DE CONTEXTO
     ======================================================= */

  document.addEventListener(

    "contextmenu",

    (evento) => {


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

  );


  /* =======================================================
     COPIAR
     ======================================================= */

  document.addEventListener(

    "copy",

    (evento) => {


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

  );


  /* =======================================================
     RECORTAR
     ======================================================= */

  document.addEventListener(

    "cut",

    (evento) => {


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

  );


  /* =======================================================
     ARRASTAR
     ======================================================= */

  document.addEventListener(

    "dragstart",

    (evento) => {


      if (
        !provaIniciada
        ||
        provaEncerrada
      ) {

        return;

      }


      evento.preventDefault();

    }

  );


  /* =======================================================
     TECLADO
     ======================================================= */

  document.addEventListener(

    "keydown",

    (evento) => {


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


      /* ===============================================
         CTRL/CMD
         =============================================== */

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


      /* ===============================================
         F12
         =============================================== */

      if (
        evento.key
        ===
        "F12"
      ) {

        evento.preventDefault();


        salvarLogViolacao(
          "Tentativa de usar F12"
        );


        return;

      }


      /* ===============================================
         CTRL + SHIFT
         =============================================== */

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

  );

}


/* =========================================================
   LOG DE VIOLAÇÃO
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


  if (
    provaEncerrada
  ) {

    return;

  }


  provaEncerrada =
    true;


  /* =======================================================
     PARAR CRONÔMETRO
     ======================================================= */

  if (
    intervalId
  ) {

    clearInterval(
      intervalId
    );


    intervalId =
      null;

  }


  /* =======================================================
     SALVAR
     ======================================================= */

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


  /* =======================================================
     MOSTRAR TELA
     ======================================================= */

  mostrarProvaEncerrada(
    motivo
  );

}


/* =========================================================
   TELA ENCERRADA
   ========================================================= */

function mostrarProvaEncerrada(
  motivo
) {


  provaEncerrada =
    true;


  esconderBloqueioPreparacao();


  if (
    elCronometro
  ) {

    elCronometro.innerText =
      "00:00";

  }


  const containerForms =
    document.getElementById(
      "container-forms"
    );


  if (
    containerForms
  ) {

    containerForms.innerHTML = `

      <div
        class="
          flex
          flex-col
          items-center
          justify-center
          min-h-[calc(100vh-65px)]
          p-8
          text-center
          space-y-4
          bg-slate-950
        "
      >

        <div
          class="
            w-16
            h-16
            rounded-full
            bg-red-950
            border
            border-red-800
            flex
            items-center
            justify-center
          "
        >

          <span class="text-3xl">
            🔒
          </span>

        </div>


        <h2
          class="
            text-3xl
            font-bold
            text-red-500
          "
        >
          Prova Encerrada
        </h2>


        <p
          class="
            text-slate-300
            max-w-md
          "
        >

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
            py-3
            rounded-lg
            text-white
            font-semibold
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

  if (
    elLoader
  ) {

    elLoader
      .classList
      .add(
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
    valor
    ??
    ""
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
   INICIAR PAS-PROVA
   ========================================================= */

inicializarProva();
