/* =========================================================
   PAS-PROVA
   PAINEL DO PROFESSOR
   ========================================================= */

import { db } from './firebase-config.js';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


/* =========================================================
   ELEMENTOS
   ========================================================= */

const formCriar =
  document.getElementById('form-criar-prova');

const listaProvas =
  document.getElementById('lista-provas');

const provaId =
  document.getElementById('prova-id');

const tituloFormulario =
  document.getElementById('titulo-formulario');

const btnSalvar =
  document.getElementById('btn-salvar-prova');

const btnCancelarEdicao =
  document.getElementById('btn-cancelar-edicao');

const btnAtualizarLista =
  document.getElementById('btn-atualizar-lista');


/* =========================================================
   CONTROLE
   ========================================================= */

let provasCarregadas = [];


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function escaparHTML(valor = "") {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function normalizarCodigo(valor = "") {

  return String(valor)
    .trim()
    .toUpperCase();

}


/* =========================================================
   SALVAR / EDITAR
   ========================================================= */

if (formCriar) {

  formCriar.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();


      const idAtual =
        provaId.value.trim();


      const codigo =
        normalizarCodigo(
          document.getElementById(
            'codigo-unico'
          ).value
        );


      const dadosProva = {

        titulo:
          document.getElementById(
            'titulo-prova'
          ).value.trim(),

        turma:
          document.getElementById(
            'turma-disciplina'
          ).value.trim(),

        linkForms:
          document.getElementById(
            'link-forms'
          ).value.trim(),

        codigo: codigo,

        duracao:
          parseInt(
            document.getElementById(
              'duracao-minutos'
            ).value,
            10
          ),

        limiteSaidas:
          parseInt(
            document.getElementById(
              'limite-saidas'
            ).value,
            10
          ),

        atualizadoEm:
          new Date().toISOString()

      };


      /* -----------------------------------------------------
         VALIDAÇÕES
         ----------------------------------------------------- */

      if (!dadosProva.titulo) {

        alert(
          "Informe o título da avaliação."
        );

        return;

      }


      if (!dadosProva.turma) {

        alert(
          "Informe a turma ou disciplina."
        );

        return;

      }


      if (!dadosProva.linkForms) {

        alert(
          "Informe o link do Google Forms."
        );

        return;

      }


      if (!codigo) {

        alert(
          "Informe um código para a prova."
        );

        return;

      }


      if (
        !Number.isFinite(dadosProva.duracao) ||
        dadosProva.duracao <= 0
      ) {

        alert(
          "Informe uma duração válida."
        );

        return;

      }


      if (
        !Number.isFinite(dadosProva.limiteSaidas) ||
        dadosProva.limiteSaidas < 0
      ) {

        alert(
          "Informe um limite de saídas válido."
        );

        return;

      }


      /* -----------------------------------------------------
         VERIFICAR CÓDIGO DUPLICADO
         ----------------------------------------------------- */

      const codigoJaExiste =
        provasCarregadas.some(
          (prova) => {

            return (
              normalizarCodigo(
                prova.codigo
              ) === codigo &&
              prova.id !== idAtual
            );

          }
        );


      if (codigoJaExiste) {

        alert(
          "Já existe uma prova com esse código."
        );

        return;

      }


      /* -----------------------------------------------------
         GRAVAR
         ----------------------------------------------------- */

      try {

        btnSalvar.disabled = true;

        btnSalvar.innerText =
          idAtual
            ? "SALVANDO ALTERAÇÕES..."
            : "SALVANDO PROVA...";


        /* ===================================================
           EDITAR PROVA EXISTENTE
           =================================================== */

        if (idAtual) {

          const referencia =
            doc(
              db,
              "provas",
              idAtual
            );


          await updateDoc(
            referencia,
            dadosProva
          );


          alert(
            "Prova atualizada com sucesso!"
          );

        }


        /* ===================================================
           CRIAR NOVA PROVA
           =================================================== */

        else {

          dadosProva.criadoEm =
            new Date().toISOString();


          await addDoc(
            collection(
              db,
              "provas"
            ),
            dadosProva
          );


          alert(
            "Prova criada com sucesso!"
          );

        }


        limparFormulario();

        await carregarProvas();

      }

      catch (err) {

        console.error(
          "Erro ao salvar prova:",
          err
        );


        alert(
          "Erro ao salvar a prova: " +
          err.message
        );

      }

      finally {

        btnSalvar.disabled = false;

      }

    }
  );

}


/* =========================================================
   CARREGAR PROVAS
   ========================================================= */

async function carregarProvas() {

  if (!listaProvas) {
    return;
  }


  try {

    listaProvas.innerHTML =
      `
        <p class="text-slate-500">
          Carregando exames...
        </p>
      `;


    const querySnapshot =
      await getDocs(
        collection(
          db,
          "provas"
        )
      );


    provasCarregadas = [];


    querySnapshot.forEach(
      (documento) => {

        provasCarregadas.push({

          id:
            documento.id,

          ...documento.data()

        });

      }
    );


    /* -------------------------------------------------------
       ORDENAÇÃO
       ------------------------------------------------------- */

    provasCarregadas.sort(
      (a, b) => {

        return String(
          a.titulo || ""
        ).localeCompare(
          String(
            b.titulo || ""
          ),
          "pt-BR"
        );

      }
    );


    /* -------------------------------------------------------
       LISTA VAZIA
       ------------------------------------------------------- */

    if (
      provasCarregadas.length === 0
    ) {

      listaProvas.innerHTML =
        `
          <p class="text-slate-500">
            Nenhuma prova cadastrada ainda.
          </p>
        `;

      return;

    }


    listaProvas.innerHTML = "";


    /* -------------------------------------------------------
       CRIAR CARTÕES
       ------------------------------------------------------- */

    provasCarregadas.forEach(
      (prova) => {

        const item =
          document.createElement(
            'div'
          );


        item.className =
          `
            bg-slate-900
            p-4
            rounded-lg
            border
            border-slate-700
          `;


        const titulo =
          escaparHTML(
            prova.titulo || "Sem título"
          );


        const turma =
          escaparHTML(
            prova.turma || ""
          );


        const codigo =
          escaparHTML(
            prova.codigo || ""
          );


        const duracao =
          Number(
            prova.duracao || 0
          );


        const limite =
          Number(
            prova.limiteSaidas ?? 0
          );


        item.innerHTML =
          `

            <div
              class="
                flex
                flex-col
                lg:flex-row
                lg:items-center
                justify-between
                gap-4
              "
            >

              <div>

                <h3
                  class="
                    font-bold
                    text-white
                    text-lg
                  "
                >
                  ${titulo}
                </h3>


                <p
                  class="
                    text-sm
                    text-slate-400
                    mt-1
                  "
                >
                  ${turma}
                </p>


                <div
                  class="
                    flex
                    flex-wrap
                    gap-x-4
                    gap-y-1
                    mt-2
                    text-xs
                    text-slate-400
                  "
                >

                  <span>
                    Código:
                    <strong
                      class="
                        text-blue-400
                        font-mono
                      "
                    >
                      ${codigo}
                    </strong>
                  </span>


                  <span>
                    Tempo:
                    ${duracao} min
                  </span>


                  <span>
                    Saídas:
                    ${limite}
                  </span>

                </div>

              </div>


              <div
                class="
                  flex
                  flex-wrap
                  gap-2
                "
              >

                <button
                  type="button"
                  data-acao="editar"
                  data-id="${prova.id}"
                  class="
                    bg-amber-600
                    hover:bg-amber-500
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded
                  "
                >
                  Editar
                </button>


                <a
                  href="./prova.html?codigo=${encodeURIComponent(
                    prova.codigo || ""
                  )}"
                  target="_blank"
                  rel="noopener"
                  class="
                    bg-slate-700
                    hover:bg-slate-600
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded
                  "
                >
                  Testar
                </a>


                <button
                  type="button"
                  data-acao="excluir"
                  data-id="${prova.id}"
                  class="
                    bg-red-700
                    hover:bg-red-600
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded
                  "
                >
                  Excluir
                </button>

              </div>

            </div>

          `;


        listaProvas.appendChild(
          item
        );

      }
    );

  }

  catch (err) {

    console.error(
      "Erro ao carregar provas:",
      err
    );


    listaProvas.innerHTML =
      `
        <p class="text-red-400 text-sm">
          Erro ao carregar provas:
          ${escaparHTML(err.message)}
        </p>
      `;

  }

}


/* =========================================================
   CLIQUES NA LISTA
   ========================================================= */

if (listaProvas) {

  listaProvas.addEventListener(
    'click',
    async (event) => {

      const botao =
        event.target.closest(
          'button[data-acao]'
        );


      if (!botao) {
        return;
      }


      const acao =
        botao.dataset.acao;


      const id =
        botao.dataset.id;


      const prova =
        provasCarregadas.find(
          (item) =>
            item.id === id
        );


      if (!prova) {

        alert(
          "Não foi possível localizar essa prova."
        );

        return;

      }


      /* =====================================================
         EDITAR
         ===================================================== */

      if (acao === "editar") {

        iniciarEdicao(
          prova
        );

        return;

      }


      /* =====================================================
         EXCLUIR
         ===================================================== */

      if (acao === "excluir") {

        await excluirProva(
          prova
        );

      }

    }
  );

}


/* =========================================================
   INICIAR EDIÇÃO
   ========================================================= */

function iniciarEdicao(prova) {

  provaId.value =
    prova.id;


  document.getElementById(
    'titulo-prova'
  ).value =
    prova.titulo || "";


  document.getElementById(
    'turma-disciplina'
  ).value =
    prova.turma || "";


  document.getElementById(
    'link-forms'
  ).value =
    prova.linkForms || "";


  document.getElementById(
    'codigo-unico'
  ).value =
    prova.codigo || "";


  document.getElementById(
    'duracao-minutos'
  ).value =
    prova.duracao ?? 50;


  document.getElementById(
    'limite-saidas'
  ).value =
    prova.limiteSaidas ?? 2;


  tituloFormulario.innerText =
    "Editar Prova";


  btnSalvar.innerText =
    "SALVAR ALTERAÇÕES";


  btnCancelarEdicao.classList.remove(
    'hidden'
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   CANCELAR EDIÇÃO
   ========================================================= */

if (btnCancelarEdicao) {

  btnCancelarEdicao.addEventListener(
    'click',
    () => {

      limparFormulario();

    }
  );

}


/* =========================================================
   LIMPAR FORMULÁRIO
   ========================================================= */

function limparFormulario() {

  formCriar.reset();


  provaId.value = "";


  document.getElementById(
    'duracao-minutos'
  ).value = 50;


  document.getElementById(
    'limite-saidas'
  ).value = 2;


  tituloFormulario.innerText =
    "Cadastrar Nova Prova";


  btnSalvar.innerText =
    "SALVAR E GERAR PROVA";


  btnCancelarEdicao.classList.add(
    'hidden'
  );

}


/* =========================================================
   EXCLUIR PROVA
   ========================================================= */

async function excluirProva(prova) {

  const confirmar =
    window.confirm(
      `Deseja realmente excluir a prova "${prova.titulo}"?\n\n` +
      `Código: ${prova.codigo}\n\n` +
      `Esta ação não poderá ser desfeita.`
    );


  if (!confirmar) {
    return;
  }


  try {

    await deleteDoc(
      doc(
        db,
        "provas",
        prova.id
      )
    );


    /*
      Se o professor estiver editando
      justamente a prova excluída,
      cancela a edição.
    */

    if (
      provaId.value === prova.id
    ) {

      limparFormulario();

    }


    alert(
      "Prova excluída com sucesso!"
    );


    await carregarProvas();

  }

  catch (err) {

    console.error(
      "Erro ao excluir prova:",
      err
    );


    alert(
      "Erro ao excluir a prova: " +
      err.message
    );

  }

}


/* =========================================================
   ATUALIZAR LISTA
   ========================================================= */

if (btnAtualizarLista) {

  btnAtualizarLista.addEventListener(
    'click',
    () => {

      carregarProvas();

    }
  );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

carregarProvas();
