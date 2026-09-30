import { db } from './firebase-config.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const formCriar = document.getElementById('form-criar-prova');
const listaProvas = document.getElementById('lista-provas');

if (formCriar) {
  formCriar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const novaProva = {
      titulo: document.getElementById('titulo-prova').value,
      turma: document.getElementById('turma-disciplina').value,
      linkForms: document.getElementById('link-forms').value,
      codigo: document.getElementById('codigo-unico').value.toUpperCase().trim(),
      duracao: parseInt(document.getElementById('duracao-minutos').value),
      limiteSaidas: parseInt(document.getElementById('limite-saidas').value),
      criadoEm: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "provas"), novaProva);
      alert("Prova criada com sucesso!");
      formCriar.reset();
      carregarProvas();
    } catch (err) {
      console.error("Erro no Firestore:", err);
      alert("Erro ao salvar no banco de dados: " + err.message);
    }
  });
}

async function carregarProvas() {
  if (!listaProvas) return;

  try {
    listaProvas.innerHTML = "<p class='text-slate-500'>Carregando exames...</p>";
    const querySnapshot = await getDocs(collection(db, "provas"));

    if (querySnapshot.empty) {
      listaProvas.innerHTML = "<p class='text-slate-500'>Nenhuma prova cadastrada ainda.</p>";
      return;
    }

    listaProvas.innerHTML = "";

    querySnapshot.forEach((documento) => {
      const data = documento.data();
      const item = document.createElement('div');
      item.className = "bg-slate-900 p-4 rounded border border-slate-700 flex justify-between items-center";
      item.innerHTML = `
        <div>
          <h3 class="font-bold text-white">${data.titulo} (${data.turma})</h3>
          <p class="text-xs text-slate-400">Código: <span class="text-blue-400 font-mono font-bold">${data.codigo}</span> | Tempo: ${data.duracao} min</p>
        </div>
        <a href="./prova.html?codigo=${data.codigo}" target="_blank" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded text-slate-300">Testar Como Aluno</a>
      `;
      listaProvas.appendChild(item);
    });
  } catch (err) {
    console.error("Erro ao carregar provas:", err);
    listaProvas.innerHTML = `<p class='text-red-400 text-xs'>Erro ao carregar provas: ${err.message}</p>`;
  }
}

carregarProvas();
