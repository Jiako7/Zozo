// ==========================================
// CLIENTES.JS
// ==========================================

let todosOsClientes = [];


// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    carregarClientes();

    configurarEventos();

});


// ==========================================
// EVENTOS
// ==========================================

function configurarEventos() {

    const botaoNovo =
        document.getElementById("btn-novo-cliente");

    const botaoCancelar =
        document.getElementById("btn-cancelar-cliente");

    const formulario =
        document.getElementById("form-cliente");

    const busca =
        document.getElementById("filtro-clientes");


    // Abrir formulário
    botaoNovo.addEventListener("click", () => {

        abrirFormulario();

    });


    // Fechar formulário
    botaoCancelar.addEventListener("click", () => {

        fecharFormulario();

    });


    // Salvar cliente
    formulario.addEventListener("submit", salvarCliente);


    // Busca
    busca.addEventListener("input", () => {

        aplicarBusca(busca.value);

    });

}


// ==========================================
// CARREGAR CLIENTES
// ==========================================

async function carregarClientes() {

    const lista =
        document.getElementById("lista-clientes");


    try {

        const resposta =
            await fetch("/api/clientes");


        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar os clientes."
            );

        }


        todosOsClientes =
            await resposta.json();


        renderizarClientes(
            todosOsClientes
        );


    } catch (erro) {

        console.error(erro);


        lista.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    style="
                        text-align: center;
                        color: var(--text-light);
                    "
                >
                    Erro ao carregar clientes.
                </td>
            </tr>
        `;

    }

}


// ==========================================
// RENDERIZAR CLIENTES
// ==========================================

function renderizarClientes(clientes) {

    const lista =
        document.getElementById("lista-clientes");

    const contador =
        document.getElementById("contador-clientes");


    contador.textContent =
        `${clientes.length} ${
            clientes.length === 1
                ? "cliente"
                : "clientes"
        }`;


    if (clientes.length === 0) {

        lista.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    style="
                        text-align: center;
                        color: var(--text-light);
                        padding: 30px;
                    "
                >
                    Nenhum cliente encontrado.
                </td>
            </tr>
        `;

        return;
    }


    lista.innerHTML =
        clientes
            .map(cliente => {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${escaparHTML(
                                    cliente.nome
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escaparHTML(
                                cliente.telefone ||
                                "Não informado"
                            )}
                        </td>

                        <td>
                            ${cliente.total_pedidos || 0}
                        </td>

                        <td>
                            ${formatarMoeda(
                                cliente.total_gasto || 0
                            )}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="btn btn-secondary"
                                onclick="excluirCliente(${cliente.id})"
                            >
                                Excluir
                            </button>

                        </td>

                    </tr>
                `;

            })
            .join("");

}


// ==========================================
// ABRIR FORMULÁRIO
// ==========================================

function abrirFormulario() {

    const formulario =
        document.getElementById(
            "formulario-cliente"
        );

    const nome =
        document.getElementById(
            "nome-cliente"
        );


    formulario.style.display = "block";


    nome.focus();


    formulario.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// ==========================================
// FECHAR FORMULÁRIO
// ==========================================

function fecharFormulario() {

    const formulario =
        document.getElementById(
            "formulario-cliente"
        );

    const form =
        document.getElementById(
            "form-cliente"
        );


    form.reset();


    formulario.style.display = "none";

}


// ==========================================
// SALVAR CLIENTE
// ==========================================

async function salvarCliente(evento) {

    evento.preventDefault();


    const nome =
        document
            .getElementById("nome-cliente")
            .value
            .trim();


    const telefone =
        document
            .getElementById("telefone-cliente")
            .value
            .trim();


    // --------------------------------------
    // VALIDAÇÃO
    // --------------------------------------

    if (!nome) {

        alert(
            "Informe o nome do cliente."
        );

        return;

    }


    // --------------------------------------
    // BOTÃO
    // --------------------------------------

    const botao =
        document.getElementById(
            "btn-salvar-cliente"
        );


    const textoOriginal =
        botao.textContent;


    botao.disabled = true;

    botao.textContent =
        "Salvando...";


    // --------------------------------------
    // DADOS
    // --------------------------------------

    const dados = {

        nome,

        telefone:
            telefone || null

    };


    try {

        const resposta =
            await fetch(
                "/api/clientes",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(dados)

                }
            );


        const resultado =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Não foi possível cadastrar o cliente."
            );

        }


        // ----------------------------------
        // SUCESSO
        // ----------------------------------

        alert(
            "Cliente cadastrado com sucesso!"
        );


        fecharFormulario();


        await carregarClientes();


    } catch (erro) {

        console.error(erro);


        alert(
            erro.message ||
            "Ocorreu um erro ao cadastrar o cliente."
        );

    }


    botao.disabled = false;

    botao.textContent =
        textoOriginal;

}


// ==========================================
// BUSCA
// ==========================================

function aplicarBusca(texto) {

    const busca =
        texto
            .trim()
            .toLowerCase();


    if (!busca) {

        renderizarClientes(
            todosOsClientes
        );

        return;

    }


    const clientesFiltrados =
        todosOsClientes.filter(cliente => {

            const nome =
                String(
                    cliente.nome || ""
                ).toLowerCase();


            const telefone =
                String(
                    cliente.telefone || ""
                ).toLowerCase();


            return (
                nome.includes(busca) ||
                telefone.includes(busca)
            );

        });


    renderizarClientes(
        clientesFiltrados
    );

}


// ==========================================
// EXCLUIR CLIENTE
// ==========================================

async function excluirCliente(id) {

    const cliente =
        todosOsClientes.find(
            item => item.id === id
        );


    if (!cliente) {
        return;
    }


    const confirmou =
        confirm(
            `Deseja realmente excluir o cliente "${cliente.nome}"?`
        );


    if (!confirmou) {
        return;
    }


    try {

        const resposta =
            await fetch(
                `/api/clientes/${id}`,
                {
                    method: "DELETE"
                }
            );


        const resultado =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Não foi possível excluir o cliente."
            );

        }


        alert(
            "Cliente excluído com sucesso!"
        );


        await carregarClientes();


    } catch (erro) {

        console.error(erro);


        alert(
            erro.message ||
            "Ocorreu um erro ao excluir o cliente."
        );

    }

}


// ==========================================
// MOEDA
// ==========================================

function formatarMoeda(valor) {

    return Number(valor || 0)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

}


// ==========================================
// ESCAPAR HTML
// ==========================================

function escaparHTML(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}