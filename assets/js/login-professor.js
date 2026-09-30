/* =========================================================
   PAS-PROVA
   LOGIN DO PROFESSOR
   ========================================================= */

import {
  auth
} from './firebase-config.js';


import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


/* =========================================================
   ELEMENTOS
   ========================================================= */

const formLogin =
  document.getElementById(
    'form-login-professor'
  );


const campoEmail =
  document.getElementById(
    'email-professor'
  );


const campoSenha =
  document.getElementById(
    'senha-professor'
  );


const mensagemLogin =
  document.getElementById(
    'mensagem-login'
  );


const btnEntrar =
  document.getElementById(
    'btn-entrar-professor'
  );


/* =========================================================
   CONTROLE
   ========================================================= */

let verificacaoInicialConcluida = false;


/* =========================================================
   MENSAGEM
   ========================================================= */

function mostrarMensagem(
  texto,
  tipo = "erro"
) {

  if (!mensagemLogin) {
    return;
  }


  mensagemLogin.classList.remove(
    'hidden',
    'bg-red-950',
    'text-red-300',
    'border',
    'border-red-800',
    'bg-emerald-950',
    'text-emerald-300',
    'border-emerald-800'
  );


  if (tipo === "sucesso") {

    mensagemLogin.classList.add(
      'bg-emerald-950',
      'text-emerald-300',
      'border',
      'border-emerald-800'
    );

  }

  else {

    mensagemLogin.classList.add(
      'bg-red-950',
      'text-red-300',
      'border',
      'border-red-800'
    );

  }


  mensagemLogin.textContent =
    texto;

}


/* =========================================================
   USUÁRIO JÁ ESTÁ LOGADO?
   ========================================================= */

onAuthStateChanged(
  auth,
  (usuario) => {

    /*
      Evita redirecionamentos inesperados
      durante o primeiro carregamento.
    */

    if (
      usuario &&
      !verificacaoInicialConcluida
    ) {

      window.location.replace(
        "./professor.html"
      );

      return;

    }


    verificacaoInicialConcluida = true;

  }
);


/* =========================================================
   LOGIN
   ========================================================= */

if (formLogin) {

  formLogin.addEventListener(
    'submit',
    async (event) => {

      event.preventDefault();


      const email =
        campoEmail.value
          .trim();


      const senha =
        campoSenha.value;


      if (
        !email ||
        !senha
      ) {

        mostrarMensagem(
          "Informe o e-mail e a senha."
        );

        return;

      }


      try {

        btnEntrar.disabled = true;

        btnEntrar.textContent =
          "ENTRANDO...";


        await signInWithEmailAndPassword(
          auth,
          email,
          senha
        );


        mostrarMensagem(
          "Login realizado. Abrindo painel...",
          "sucesso"
        );


        window.location.replace(
          "./professor.html"
        );

      }

      catch (erro) {

        console.error(
          "Erro de autenticação:",
          erro
        );


        /*
          Não informamos se foi especificamente
          o e-mail ou a senha que estava errado.
        */

        mostrarMensagem(
          "E-mail ou senha inválidos."
        );

      }

      finally {

        btnEntrar.disabled = false;

        btnEntrar.textContent =
          "ENTRAR";

      }

    }
  );

}
