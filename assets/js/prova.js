/* =========================================================
   PAS-PROVA
   EXECUÇÃO DA PROVA
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
    'codigo'
  );


const tentativaId =
  urlParams.get(
    'tentativa'
  );


const nomeAluno =
  sessionStorage.getItem(
    'aluno_nome'
  )
  ||
  "Aluno Não Identificado";


/* =========================================================
   VALIDAÇÃO DA TENTATIVA
   ========================================================= */

/*
  Cada tentativa possui sua própria chave.

  Portanto:

  João / tentativa A = sessão A
  Maria / tentativa B = sessão B

  Mesmo que os dois utilizem o mesmo código.
*/

const chaveSessao =
  codigoProva && tentativaId

    ? `pas_prova_${codigoProva}_${tentativaId}`

    : null;


/* =========================================================
   ESTADO
   ========================================================= */

let tempoRestanteSegundos = 0;

let contadorAlertas = 0;

let limiteSaidas = 2;

let intervalId = null;

let horarioFim = null;

let provaEncerrada = false;

let monitoramentoIniciado = false;


/*
  Controle de ocultação.

  A saída só será confirmada quando
  a mesma página voltar a ficar visível.
*/

let paginaFicouOculta = false;


/* =========================================================
   ELEMENTOS
   ========================================================= */

const elInfoAluno =
  document.getElementById(
    'info-aluno'
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
   INICIALIZAÇÃO
   ========================================================= */

async function inicializarProva() {

  /* =======================================================
     CÓDIGO INVÁLIDO
     ======================================================= */

  if (!codigoProva) {

    alert(
      "Código da prova não fornecido!"
    );


    window.location.href =
      "./index.html";


    return;

  }


  /* =======================================================
     TENTATIVA INVÁLIDA
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


    if (
      querySnapshot.empty
    ) {

      alert(
        "Prova não encontrada!"
      );


      window.location.href =
        "./index.html";


      return;

    }


    const dadosProva =
      querySnapshot
        .docs[0]
        .data();


    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const elTitulo =
      document.getElementById(
        'titulo-exame'
      );


    const elIframe =
      document.getElementById(
        'iframe-forms'
      );


    const elLoader =
      document.getElementById(
        'loader'
      );


    if (elTitulo) {

      elTitulo.innerText =
        `${dadosProva.titulo} (${dadosProva.turma})`;

    }


    limiteSaidas =
      dadosProva.limiteSaidas
      ??
      2;


    /* =====================================================
       RECUPERAR SESSÃO DA TENTATIVA
       ===================================================== */

    const sessao =
      carregarSessao();


    /* =====================================================
       TENTATIVA JÁ ENCERRADA
       ===================================================== */

    if (
      sessao
      &&
      sessao.encerrada === true
    ) {

      contadorAlertas =
        Number(
          sessao.contadorAlertas
          ||
          0
        );


      atualizarContadorAlertas();


      if (elLoader) {

        elLoader.classList.add(
          'hidden'
        );

      }


      mostrarProvaEncerrada(

        sessao.motivoEncerramento
        ||
        "Esta prova já foi encerrada."

      );


      return;

    }


    /* =====================================================
       TENTATIVA EXISTENTE
       ===================================================== */

    if (
      sessao
      &&
      sessao.horarioFim
    ) {

      horarioFim =
        Number(
          sessao.horarioFim
        );


      contadorAlertas =
        Number(
          sessao.contadorAlertas
          ||
          0
        );

    }


    /* =====================================================
       NOVA TENTATIVA
       ===================================================== */

    else {

      const duracaoMinutos =
        Number(
          dadosProva.duracao
          ||
          50
        );


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


      contadorAlertas = 0;

      provaEncerrada = false;


      salvarSessao({

        iniciadaEm:
          new Date()
            .toISOString(),

        encerrada:
          false

      });

    }


    atualizarContadorAlertas();


    /* =====================================================
       VERIFICAR TEMPO
       ===================================================== */

    const restante =
      calcularTempoRestante();


    if (
      restante <= 0
    ) {

      encerrarProva(
        "Tempo Esgotado!"
      );


      if (elLoader) {

        elLoader.classList.add(
          'hidden'
        );

      }


      return;

    }


    /* =====================================================
       GOOGLE FORMS
       ===================================================== */

    if (elIframe) {

      /*
        Cada NOVA tentativa recebe uma URL
        diferente.

        Isso força uma nova navegação do iframe.

        IMPORTANTE:
        o parâmetro é ignorado pelo Forms,
        mas altera a URL solicitada.
      */

      const separador =
        dadosProva.linkForms.includes("?")
          ? "&"
          : "?";


      const urlForms =
        dadosProva.linkForms
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


    if (elLoader) {

      elLoader.classList.add(
        'hidden'
      );

    }


    /* =====================================================
       INICIAR SISTEMA
       ===================================================== */

    iniciarCronometro();

    iniciarMonitoramentoSessao();

    iniciarProtecoesContraCopia();

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
   ATUALIZAR CRONÔMETRO
   ========================================================= */

function atualizarCronometro() {

  const elCronometro =
    document.getElementById(
      'cronometro'
    );


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
      '0'
    );


  const segundos =
    String(
      tempoRestanteSegundos
      %
      60
    ).padStart(
      2,
      '0'
    );


  if (elCronometro) {

    elCronometro.innerText =
      `${minutos}:${segundos}`;

  }

}


/* =========================================================
   CRONÔMETRO
   ========================================================= */

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
   CONTADOR DE ALERTAS
   ========================================================= */

function atualizarContadorAlertas() {

  const elAlertas =
    document.getElementById(
      'contador-alertas'
    );


  if (elAlertas) {

    elAlertas.innerText =
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

    'visibilitychange',

    () => {

      if (
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
         PÁGINA VOLTOU A FICAR VISÍVEL
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

  /* =======================================================
     BOTÃO DIREITO
     ======================================================= */

  document.addEventListener(

    'contextmenu',

    (evento) => {

      evento.preventDefault();


      if (
        !provaEncerrada
      ) {

        salvarLogViolacao(
          "Tentativa de abrir menu de contexto"
        );

      }

    }

  );


  /* =======================================================
     COPIAR
     ======================================================= */

  document.addEventListener(

    'copy',

    (evento) => {

      evento.preventDefault();


      if (
        !provaEncerrada
      ) {

        salvarLogViolacao(
          "Tentativa de copiar conteúdo"
        );

      }

    }

  );


  /* =======================================================
     RECORTAR
     ======================================================= */

  document.addEventListener(

    'cut',

    (evento) => {

      evento.preventDefault();


      if (
        !provaEncerrada
      ) {

        salvarLogViolacao(
          "Tentativa de recortar conteúdo"
        );

      }

    }

  );


  /* =======================================================
     ARRASTAR
     ======================================================= */

  document.addEventListener(

    'dragstart',

    (evento) => {

      evento.preventDefault();

    }

  );


  /* =======================================================
     ATALHOS
     ======================================================= */

  document.addEventListener(

    'keydown',

    (evento) => {

      if (
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


      /*
        Ctrl/Cmd + C
        Ctrl/Cmd + X
        Ctrl/Cmd + A
        Ctrl/Cmd + S
        Ctrl/Cmd + P
        Ctrl/Cmd + U
      */

      if (
        modificador
        &&
        [
          'c',
          'x',
          'a',
          's',
          'p',
          'u'
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


      /*
        F12
      */

      if (
        evento.key ===
        'F12'
      ) {

        evento.preventDefault();


        salvarLogViolacao(
          "Tentativa de usar F12"
        );


        return;

      }


      /*
        Ctrl + Shift + I
        Ctrl + Shift + J
        Ctrl + Shift + C
      */

      if (
        evento.ctrlKey
        &&
        evento.shiftKey
        &&
        [
          'i',
          'j',
          'c'
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
   SALVAR LOG
   ========================================================= */

async function salvarLogViolacao(
  tipo
) {

  if (
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


  if (
    intervalId
  ) {

    clearInterval(
      intervalId
    );


    intervalId =
      null;

  }


  salvarSessao({

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
   TELA DE PROVA ENCERRADA
   ========================================================= */

function mostrarProvaEncerrada(
  motivo
) {

  provaEncerrada =
    true;


  const elCronometro =
    document.getElementById(
      'cronometro'
    );


  if (
    elCronometro
  ) {

    elCronometro.innerText =
      "00:00";

  }


  const containerForms =
    document.getElementById(
      'container-forms'
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
          esta tentativa.
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
   PROTEÇÃO DE TEXTO
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
