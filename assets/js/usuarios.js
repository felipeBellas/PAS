/* =========================================================
   PAS-PROVA
   GERENCIAMENTO DE USUÁRIOS
   ========================================================= */

import {
  db,
  auth
} from './firebase-config.js';

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


/* =========================================================
   ELEMENTOS
   ========================================================= */

const conteudoUsuarios =
  document.getElementById('conteudo-usuarios');

const listaUsuarios =
  document.getElementById('lista-usuarios');

const totalUsuarios =
  document.getElementById('total-usuarios');

const btnAtualizarUsuarios =
  document.getElementById('btn-atualizar-usuarios');

const btnVoltarPainel =
  document.getElementById('btn-voltar-painel');


/* =========================================================
   ESTADO
   ========================================================= */

let usuarioAtual = null;

let dadosUsuarioAtual = null;

let usuariosCarregados = [];


/* =========================================================
   AUTENTICAÇÃO E AUTORIZAÇÃO
   ========================================================= */

onAuthStateChanged(
  auth,

  async (usuario) => {

    if (!usuario) {

      window.location.href =
        "./login-professor.html";

      return;
    }

    try {

      const referenciaUsuario =
        doc(
          db,
          "usuarios",
          usuario.uid
        );

      const documentoUsuario =
        await getDoc(
          referenciaUsuario
        );

      if (!documentoUsuario.exists()) {

        alert(
          "Usuário sem autorização para acessar esta área."
        );

        window.location.href =
          "./professor.html";

        return;
      }

      const dadosUsuario =
        documentoUsuario.data();

      if (dadosUsuario.ativo !== true) {

        alert(
          "Este usuário está desativado."
        );

        window.location.href =
          "./login-professor.html";

        return;
      }

      if (
        dadosUsuario.perfil !== "administrador"
      ) {

        alert(
          "Esta área é exclusiva do administrador."
        );

        window.location.href =
          "./professor.html";

        return;
      }

      usuarioAtual = usuario;

      dadosUsuarioAtual = dadosUsuario;

      console.log(
        "PAS-PROVA - Administrador:",
        dadosUsuarioAtual.nome ||
        usuarioAtual.email
      );

      if (conteudoUsuarios) {

        conteudoUsuarios.classList.remove(
          "hidden"
        );
      }

      await carregarUsuarios();

    }

    catch (erro) {

      console.error(
        "Erro ao verificar administrador:",
        erro
      );

      alert(
        "Não foi possível verificar as permissões do usuário."
      );

      window.location.href =
        "./professor.html";
    }

  }
);


/* =========================================================
   CARREGAR USUÁRIOS
   ========================================================= */

async function carregarUsuarios() {

  if (!listaUsuarios) {
    return;
  }

  listaUsuarios.innerHTML = `
    <p class="text-slate-500">
      Carregando usuários...
    </p>
  `;

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "usuarios"
        )
      );

    usuariosCarregados = [];

    snapshot.forEach(
      (documento) => {

        usuariosCarregados.push({

          id: documento.id,

          ...documento.data()

        });

      }
    );

    usuariosCarregados.sort(
      (a, b) => {

        if (
          a.perfil === "administrador" &&
          b.perfil !== "administrador"
        ) {
          return -1;
        }

        if (
          a.perfil !== "administrador" &&
          b.perfil === "administrador"
        ) {
          return 1;
        }

        return (
          a.nome || ""
        ).localeCompare(
          b.nome || "",
          "pt-BR"
        );

      }
    );

    if (totalUsuarios) {

      totalUsuarios.innerText =
        `${usuariosCarregados.length} usuário(s) cadastrado(s)`;
    }

    if (usuariosCarregados.length === 0) {

      listaUsuarios.innerHTML = `
        <div
          class="
            border
            border-slate-700
            rounded-lg
            p-5
            text-slate-400
          "
        >
          Nenhum usuário cadastrado.
        </div>
      `;

      return;
    }

    listaUsuarios.innerHTML = "";

    usuariosCarregados.forEach(
      (usuario) => {

        const card =
          criarCardUsuario(
            usuario
          );

        listaUsuarios.appendChild(
          card
        );

      }
    );

  }

  catch (erro) {

    console.error(
      "Erro ao carregar usuários:",
      erro
    );

    listaUsuarios.innerHTML = `
      <div
        class="
          bg-red-950/30
          border
          border-red-900
          rounded-lg
          p-5
        "
      >
        <p class="text-red-400 font-bold">
          Erro ao carregar usuários.
        </p>

        <p class="text-xs text-red-300 mt-2">
          ${escapeHtml(
            erro.message ||
            "Erro desconhecido"
          )}
        </p>
      </div>
    `;

    if (totalUsuarios) {

      totalUsuarios.innerText =
        "Não foi possível carregar os usuários";
    }

  }

}


/* =========================================================
   CRIAR CARD DO USUÁRIO
   ========================================================= */

function criarCardUsuario(usuario) {

  const card =
    document.createElement("div");

  card.className = `
    bg-slate-900
    border
    border-slate-700
    rounded-lg
    p-5
  `;

  const nome =
    usuario.nome ||
    "Usuário sem nome";

  const email =
    usuario.email ||
    "E-mail não informado";

  const perfil =
    usuario.perfil === "administrador"
      ? "Administrador"
      : "Professor";

  const estaAtivo =
    usuario.ativo === true;

  const ehPropriaConta =
    usuarioAtual &&
    usuario.id === usuarioAtual.uid;

  const classePerfil =
    usuario.perfil === "administrador"
      ? "bg-blue-950 text-blue-300 border-blue-800"
      : "bg-slate-800 text-slate-300 border-slate-700";

  const classeStatus =
    estaAtivo
      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
      : "bg-red-950 text-red-300 border-red-800";

  const textoStatus =
    estaAtivo
      ? "Ativo"
      : "Desativado";


  let controles = "";


  /*
    A própria conta administrativa fica protegida.
  */

  if (ehPropriaConta) {

    controles = `
      <div class="mt-4">
        <span
          class="
            inline-block
            text-xs
            text-slate-500
            border
            border-slate-700
            rounded
            px-3
            py-2
          "
        >
          Conta administrativa atual
        </span>
      </div>
    `;

  }

  else {

    controles = `
      <div
        class="
          flex
          flex-wrap
          gap-2
          mt-4
        "
      >

        <button
          type="button"
          data-acao="editar"
          data-id="${escapeHtml(usuario.id)}"
          class="
            bg-blue-600
            hover:bg-blue-500
            text-white
            text-xs
            font-bold
            px-4
            py-2
            rounded
            transition
          "
        >
          Editar
        </button>


        <button
          type="button"
          data-acao="status"
          data-id="${escapeHtml(usuario.id)}"
          class="
            ${
              estaAtivo
                ? "bg-red-700 hover:bg-red-600"
                : "bg-emerald-700 hover:bg-emerald-600"
            }
            text-white
            text-xs
            font-bold
            px-4
            py-2
            rounded
            transition
          "
        >
          ${
            estaAtivo
              ? "Desativar"
              : "Ativar"
          }
        </button>

      </div>
    `;

  }


  card.innerHTML = `

    <div
      class="
        flex
        flex-col
        md:flex-row
        md:items-start
        md:justify-between
        gap-4
      "
    >

      <div class="min-w-0">

        <h3
          class="
            text-lg
            font-bold
            text-slate-100
            break-words
          "
        >
          ${escapeHtml(nome)}
        </h3>


        <p
          class="
            text-sm
            text-slate-400
            break-all
            mt-1
          "
        >
          ${escapeHtml(email)}
        </p>


        <p
          class="
            text-[10px]
            text-slate-600
            mt-2
            break-all
          "
        >
          UID: ${escapeHtml(usuario.id)}
        </p>


        ${controles}

      </div>


      <div
        class="
          flex
          flex-wrap
          items-center
          gap-2
        "
      >

        <span
          class="
            border
            rounded-full
            px-3
            py-1
            text-xs
            font-bold
            ${classePerfil}
          "
        >
          ${perfil}
        </span>


        <span
          class="
            border
            rounded-full
            px-3
            py-1
            text-xs
            font-bold
            ${classeStatus}
          "
        >
          ${textoStatus}
        </span>

      </div>

    </div>
  `;


  return card;

}


/* =========================================================
   CLIQUES NOS CONTROLES DOS USUÁRIOS
   ========================================================= */

if (listaUsuarios) {

  listaUsuarios.addEventListener(
    "click",

    async (evento) => {

      const botao =
        evento.target.closest(
          "button[data-acao]"
        );

      if (!botao) {
        return;
      }


      const acao =
        botao.dataset.acao;

      const usuarioId =
        botao.dataset.id;


      const usuario =
        usuariosCarregados.find(
          (item) =>
            item.id === usuarioId
        );


      if (!usuario) {

        alert(
          "Usuário não encontrado."
        );

        return;
      }


      /*
        Proteção adicional:
        não permitir alterações na própria
        conta administrativa por esta tela.
      */

      if (
        usuarioAtual &&
        usuario.id === usuarioAtual.uid
      ) {

        alert(
          "A conta administrativa atual está protegida."
        );

        return;
      }


      if (acao === "editar") {

        await editarUsuario(
          usuario
        );

        return;
      }


      if (acao === "status") {

        await alterarStatusUsuario(
          usuario
        );

      }

    }
  );

}


/* =========================================================
   EDITAR USUÁRIO
   ========================================================= */

async function editarUsuario(usuario) {

  /*
    Nesta primeira versão editamos nome e perfil.
    O e-mail do Firebase Authentication não será
    alterado por aqui.
  */

  const novoNome =
    window.prompt(
      "Nome do usuário:",
      usuario.nome || ""
    );


  if (novoNome === null) {
    return;
  }


  const nomeLimpo =
    novoNome.trim();


  if (!nomeLimpo) {

    alert(
      "O nome não pode ficar vazio."
    );

    return;
  }


  const perfilAtualUsuario =
    usuario.perfil === "administrador"
      ? "administrador"
      : "professor";


  const novoPerfil =
    window.prompt(
      'Perfil do usuário.\nDigite "professor" ou "administrador":',
      perfilAtualUsuario
    );


  if (novoPerfil === null) {
    return;
  }


  const perfilLimpo =
    novoPerfil
      .trim()
      .toLowerCase();


  if (
    perfilLimpo !== "professor" &&
    perfilLimpo !== "administrador"
  ) {

    alert(
      'Perfil inválido. Use "professor" ou "administrador".'
    );

    return;
  }


  const confirmou =
    window.confirm(
      `Salvar alterações de ${nomeLimpo}?`
    );


  if (!confirmou) {
    return;
  }


  try {

    await updateDoc(
      doc(
        db,
        "usuarios",
        usuario.id
      ),
      {
        nome: nomeLimpo,
        perfil: perfilLimpo
      }
    );


    alert(
      "Usuário atualizado com sucesso."
    );


    await carregarUsuarios();

  }

  catch (erro) {

    console.error(
      "Erro ao editar usuário:",
      erro
    );


    alert(
      "Não foi possível atualizar o usuário: " +
      erro.message
    );

  }

}


/* =========================================================
   ATIVAR / DESATIVAR
   ========================================================= */

async function alterarStatusUsuario(usuario) {

  const novoStatus =
    usuario.ativo !== true;


  const acao =
    novoStatus
      ? "ativar"
      : "desativar";


  const confirmou =
    window.confirm(
      `Deseja realmente ${acao} o usuário "${usuario.nome || usuario.email}"?`
    );


  if (!confirmou) {
    return;
  }


  try {

    await updateDoc(
      doc(
        db,
        "usuarios",
        usuario.id
      ),
      {
        ativo: novoStatus
      }
    );


    alert(
      novoStatus
        ? "Usuário ativado com sucesso."
        : "Usuário desativado com sucesso."
    );


    await carregarUsuarios();

  }

  catch (erro) {

    console.error(
      "Erro ao alterar status:",
      erro
    );


    alert(
      "Não foi possível alterar o status do usuário: " +
      erro.message
    );

  }

}


/* =========================================================
   PROTEÇÃO DE TEXTO
   ========================================================= */

function escapeHtml(valor) {

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
   ATUALIZAR
   ========================================================= */

if (btnAtualizarUsuarios) {

  btnAtualizarUsuarios.addEventListener(
    "click",

    async () => {

      await carregarUsuarios();

    }
  );

}


/* =========================================================
   VOLTAR
   ========================================================= */

if (btnVoltarPainel) {

  btnVoltarPainel.addEventListener(
    "click",

    () => {

      window.location.href =
        "./professor.html";

    }
  );

}
