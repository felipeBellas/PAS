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
  doc
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



/* =========================================================
   AUTENTICAÇÃO E AUTORIZAÇÃO
   ========================================================= */

onAuthStateChanged(
  auth,

  async (usuario) => {

    /*
      Nenhum usuário autenticado.
    */

    if (!usuario) {

      window.location.href =
        "./login-professor.html";

      return;

    }


    try {

      /*
        Buscar o cadastro do usuário autenticado.
      */

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


      /*
        O usuário existe no Authentication,
        mas não possui cadastro autorizado
        no Firestore.
      */

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


      /*
        Usuário desativado.
      */

      if (dadosUsuario.ativo !== true) {

        alert(
          "Este usuário está desativado."
        );

        window.location.href =
          "./login-professor.html";

        return;

      }


      /*
        SOMENTE ADMINISTRADOR.
      */

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


      /*
        Administrador autorizado.
      */

      usuarioAtual = usuario;

      dadosUsuarioAtual = dadosUsuario;


      console.log(
        "PAS-PROVA - Administrador:",
        dadosUsuarioAtual.nome ||
        usuarioAtual.email
      );


      /*
        Somente agora mostramos a página.
      */

      if (conteudoUsuarios) {

        conteudoUsuarios.classList.remove(
          "hidden"
        );

      }


      /*
        Carregar usuários.
      */

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


    const usuarios = [];


    snapshot.forEach(
      (documento) => {

        usuarios.push({

          id: documento.id,

          ...documento.data()

        });

      }
    );



    /*
      Administradores primeiro.
      Depois ordenar pelo nome.
    */

    usuarios.sort(
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



    /*
      Total.
    */

    if (totalUsuarios) {

      totalUsuarios.innerText =
        `${usuarios.length} usuário(s) cadastrado(s)`;

    }



    /*
      Nenhum usuário.
    */

    if (usuarios.length === 0) {

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



    /*
      Renderizar lista.
    */

    listaUsuarios.innerHTML = "";


    usuarios.forEach(
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



  card.innerHTML = `

    <div
      class="
        flex
        flex-col
        md:flex-row
        md:items-center
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
