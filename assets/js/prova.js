/* =========================================================
   PAS-PROVA
   EXECUÇÃO DA AVALIAÇÃO

   VERSÃO:
   - início automático
   - cronômetro persistente
   - tentativa individual
   - F5 não reinicia tempo
   - monitoramento de troca de tela
   - encerramento persistente
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
   PARÂMETROS DA URL
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


/* =========================================================
   ALUNO
   ========================================================= */

const nomeAluno =
  sessionStorage.getItem(
    "aluno_nome"
  )
  ||
  "Aluno Não Identificado";


/* =========================================================
   CHAVE ÚNICA DA TENTATIVA
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


/* =========================================================
   MOSTRAR ALUNO
   ========================================================= */

if (elInfoAluno) {

  elInfoAluno.innerText =
    `Aluno: ${nomeAluno}`;

}


/* =========================================================
   CARREGAR SESSÃO
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
   INICIALIZAR PROVA
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
      "Sessão da avaliação inválida. Entre novamente pelo início."
    );


    window.location.href =
      "./index.html";


    return;

  }


  try {


    /* =====================================================
       LOCALIZAR PROVA
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
       NÃO ENCONTRADA
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
       RECUPERAR SESSÃO EXISTENTE
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
       TENTATIVA JÁ ENCERRADA
       ===================================================== */

    if (
      provaEncerrada
    ) {

      esconderLoader();


      mostrarProvaEncerrada(

        sessao?.motivoEncerramento
        ||
        "Esta prova já foi encerrada."

      );


      return;

    }


    /* =====================================================
       TENTATIVA JÁ INICIADA
       ===================================================== */

    if (
      provaIniciada
      &&
      horarioFim
    ) {


      /*
       * Estamos retornando à mesma tentativa.
       *
       * NÃO cria novo horário.
       */


      if (
        calcularTempoRestante()
        <=
        0
      ) {

        esconderLoader();


        encerrarProva(
          "Tempo Esgotado!"
        );


        return;

      }


      /*
       * Recarrega o Forms.
       */

      carregarGoogleForms();


      esconderLoader();


      /*
       * Continua exatamente com o
       * horário final anterior.
       */

      iniciarCronometro();


      iniciarMonitoramentoSessao();


      iniciarProtecoesContraCopia();


      return;

    }


    /* =====================================================
       PRIMEIRA ABERTURA DA TENTATIVA
       ===================================================== */

    iniciarNovaTentativa();


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
   INICIAR NOVA TENTATIVA
   ========================================================= */

function iniciarNovaTentativa() {


  if (
    !dadosProvaAtual
  ) {

    return;

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
     HORÁRIO FINAL ABSOLUTO
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
     ESTADO
     ======================================================= */

  provaIniciada =
    true;


  provaEncerrada =
    false;


  contadorAlertas =
    0;


  /* =======================================================
     SALVAR IMEDIATAMENTE
     ======================================================= */

  salvarSessao({

    criadaEm:
      new Date()
        .toISOString(),

    iniciada:
      true,

    iniciadaEm:
      new Date()
        .toISOString(),

    encerrada:
      false

  });


  atualizarContadorAlertas();


  /*
   * O cronômetro começa antes mesmo
   * de aguardarmos qualquer interação
   * com o Google Forms.
   */

  iniciarCronometro();


  /*
   * Carrega o Forms.
   */

  carregarGoogleForms();


  /*
   * Libera a tela.
   */

  esconderLoader();


  /*
   * Ativa monitoramento.
   */

  iniciarMonitoramentoSessao();


  /*
   * Ativa proteções da página PAS.
   */

  iniciarProtecoesContraCopia();

}


/* =========================================================
   CARREGAR GOOGLE FORMS
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
   * Identificador exclusivo da tentativa.
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
   CALCULAR TEMPO RESTANTE
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


  if (elCronometro) {

    elCronometro.innerText =
      `${minutos}:${segundos}`;

  }

}


/* =========================================================
   INICIAR CRONÔMETRO
   ========================================================= */

function iniciarCronometro() {


  if (intervalId) {

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

  if (elContadorAlertas) {

    elContadorAlertas.innerText =
      contadorAlertas;

  }

}


/* =========================================================
   MONITORAMENTO DE SAÍDA
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


      /*
       * A página ficou invisível.
       */

      if (
        document.hidden
      ) {

        paginaFicouOculta =
          true;


        return;

      }


      /*
       * A mesma página voltou a ficar visível.
       *
       * Isso diferencia uma troca real de aba
       * de um simples F5.
       */

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
   REGISTRAR SAÍDA DE TELA
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


  /* =======================================================
     LIMITE
     ======================================================= */

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
   PROTEÇÕES DA PÁGINA
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
     MENU CONTEXTUAL
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
     ATALHOS
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
         CTRL/CMD + TECLA
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
         CTRL + SHIFT + I/J/C
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
     SALVAR ENCERRAMENTO
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
     MOSTRAR TELA FINAL
     ======================================================= */

  mostrarProvaEncerrada(
    motivo
  );

}


/* =========================================================
   TELA DE PROVA ENCERRADA
   ========================================================= */

function mostrarProvaEncerrada(
  motivo
) {


  provaEncerrada =
    true;


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
   ESCONDER LOADER
   ========================================================= */

function esconderLoader() {

  if (elLoader) {

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
