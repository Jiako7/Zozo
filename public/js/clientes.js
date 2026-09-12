let todosOsClientes = [];
let clienteSelecionado = null;
let requisicaoHistorico = null;

document.addEventListener("DOMContentLoaded", () => {
    carregarClientes();
    configurarEventos();
    verificarModoAtendimento();
});

function configurarEventos() {
    const botaoNovo = document.getElementById("btn-novo-cliente");
    const botaoCancelar = document.getElementById("btn-cancelar-cliente");
    const botaoTrocar = document.getElementById("btn-trocar-cliente");
    const botaoHistorico = document.getElementById("acao-ver-historico");
    const formulario = document.getElementById("form-cliente");
    const busca = document.getElementById("filtro-clientes");
    const campoNome = document.getElementById("nome-cliente");
    const campoTelefone = document.getElementById("telefone-cliente");

    botaoNovo?.addEventListener("click", abrirFormulario);
    botaoCancelar?.addEventListener("click", fecharFormulario);
    botaoTrocar?.addEventListener("click", removerSelecao);
    botaoHistorico?.addEventListener("click", alternarHistorico);
    formulario?.addEventListener("submit", salvarCliente);

    busca?.addEventListener("input", () => {
        aplicarBusca(busca.value);
    });

    campoNome?.addEventListener("input", () => {
        campoNome.value = campoNome.value.replace(/[0-9]/g, "");
    });

    campoTelefone?.addEventListener("input", () => {
        campoTelefone.value = formatarTelefone(campoTelefone.value);
    });
}

function formatarTelefone(valor) {
    const numeros = String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 11);

    if (numeros.length <= 2) {
        return numeros ? `(${numeros}` : "";
    }

    if (numeros.length <= 6) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }

    const fimPrefixo = numeros.length <= 10 ? 6 : 7;

    return `(${numeros.slice(0, 2)}) ` +
        `${numeros.slice(2, fimPrefixo)}-` +
        numeros.slice(fimPrefixo);
}

function verificarModoAtendimento() {
    const parametros = new URLSearchParams(window.location.search);

    if (parametros.get("atendimento") === "1") {
        setTimeout(() => {
            document.getElementById("filtro-clientes")?.focus();
        }, 150);
    }
}

async function carregarClientes() {
    const lista = document.getElementById("lista-clientes");

    try {
        const resposta = await fetch("/api/clientes");

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os clientes.");
        }

        todosOsClientes = await resposta.json();
        renderizarClientes(todosOsClientes);
    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);

        if (lista) {
            lista.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Não foi possível carregar os clientes.
                    </td>
                </tr>
            `;
        }
    }
}

function renderizarClientes(clientes) {
    const lista = document.getElementById("lista-clientes");
    const contador = document.getElementById("contador-clientes");

    if (!lista || !contador) return;

    contador.textContent = `${clientes.length} ${
        clientes.length === 1 ? "cliente" : "clientes"
    }`;

    if (clientes.length === 0) {
        lista.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Nenhum cliente encontrado.
                    Você pode cadastrar um novo cliente.
                </td>
            </tr>
        `;
        return;
    }

    lista.innerHTML = clientes.map(cliente => {
        const nome = escaparHTML(cliente.nome || "—");
        const telefone = escaparHTML(cliente.telefone || "Não informado");
        const pedidos = Number(cliente.total_pedidos || 0);
        const gasto = formatarMoeda(cliente.total_gasto || 0);

        return `
            <tr>
                <td>
                    <span class="cliente-nome">${nome}</span>
                </td>

                <td>${telefone}</td>
                <td>${pedidos}</td>
                <td>${gasto}</td>

                <td>
                    <div class="acoes-cliente">
                        <button
                            type="button"
                            class="btn-atender"
                            onclick="selecionarCliente(${cliente.id})"
                        >
                            Atender
                        </button>

                        <button
                            type="button"
                            class="btn-excluir-discreto"
                            onclick="excluirCliente(${cliente.id})"
                        >
                            Excluir
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function selecionarCliente(id) {
    const cliente = todosOsClientes.find(
        item => Number(item.id) === Number(id)
    );

    if (!cliente) return;

    fecharHistorico();
    clienteSelecionado = cliente;

    definirTexto("cliente-selecionado-nome", cliente.nome || "—");

    definirTexto(
        "cliente-selecionado-telefone",
        cliente.telefone || "Não informado"
    );

    definirTexto(
        "cliente-selecionado-pedidos",
        cliente.total_pedidos || 0
    );

    configurarLinksAtendimento(cliente);

    const painel = document.getElementById("cliente-selecionado");

    if (painel) {
        painel.classList.add("ativo");

        painel.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

function configurarLinksAtendimento(cliente) {
    const pedido = document.getElementById("acao-novo-pedido");
    const orcamento = document.getElementById("acao-novo-orcamento");

    const id = encodeURIComponent(cliente.id);
    const nome = encodeURIComponent(cliente.nome || "");

    if (pedido) {
        pedido.href =
            `pedido.html?cliente_id=${id}&cliente_nome=${nome}`;
    }

    if (orcamento) {
        orcamento.href =
            `orcamentos.html?novo=1&cliente_id=${id}&cliente_nome=${nome}`;
    }
}

function removerSelecao() {
    fecharHistorico();
    clienteSelecionado = null;

    const painel = document.getElementById("cliente-selecionado");
    painel?.classList.remove("ativo");

    const busca = document.getElementById("filtro-clientes");

    if (busca) {
        busca.focus();

        busca.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

function fecharHistorico() {
    if (requisicaoHistorico) {
        requisicaoHistorico.abort();
        requisicaoHistorico = null;
    }

    const painel = document.getElementById("historico-cliente");
    const botao = document.getElementById("acao-ver-historico");

    if (painel) painel.hidden = true;
    if (botao) botao.setAttribute("aria-expanded", "false");
}

async function alternarHistorico() {
    const painel = document.getElementById("historico-cliente");
    const conteudo = document.getElementById("historico-cliente-conteudo");
    const botao = document.getElementById("acao-ver-historico");

    if (!clienteSelecionado || !painel || !conteudo) return;

    if (!painel.hidden) {
        fecharHistorico();
        return;
    }

    const id = clienteSelecionado.id;
    const controlador = new AbortController();

    requisicaoHistorico = controlador;
    painel.hidden = false;
    botao?.setAttribute("aria-expanded", "true");
    conteudo.textContent = "Carregando histórico...";

    try {
        const filtro = encodeURIComponent(id);

        const [respostaPedidos, respostaOrcamentos] = await Promise.all([
            fetch(`/api/pedidos?cliente_id=${filtro}`, {
                signal: controlador.signal
            }),
            fetch(`/api/orcamentos?cliente_id=${filtro}`, {
                signal: controlador.signal
            })
        ]);

        if (!respostaPedidos.ok || !respostaOrcamentos.ok) {
            throw new Error("Falha ao consultar o histórico.");
        }

        const [pedidos, orcamentos] = await Promise.all([
            respostaPedidos.json(),
            respostaOrcamentos.json()
        ]);

        if (
            controlador.signal.aborted ||
            Number(clienteSelecionado?.id) !== Number(id)
        ) {
            return;
        }

        conteudo.innerHTML =
            montarGrupoHistorico("Pedidos", pedidos, "pedido") +
            montarGrupoHistorico("Orçamentos", orcamentos, "orcamento");
    } catch (erro) {
        if (erro.name !== "AbortError") {
            console.error("Erro ao carregar histórico:", erro);

            conteudo.textContent =
                "Não foi possível carregar o histórico. " +
                "Feche e abra novamente para tentar.";
        }
    } finally {
        if (requisicaoHistorico === controlador) {
            requisicaoHistorico = null;
        }
    }
}

function montarGrupoHistorico(titulo, registros, tipo) {
    if (!Array.isArray(registros)) {
        throw new Error("Resposta inválida do histórico.");
    }

    const itens = registros.length
        ? registros.map(registro => {
            const numero =
                registro.numero_pedido ||
                registro.numero_orcamento ||
                `#${registro.id}`;

            const descricao = tipo === "pedido"
                ? registro.servico || "Serviço não informado"
                : "Orçamento";

            const data = tipo === "pedido"
                ? registro.data_entrada
                : registro.data;

            const valor = tipo === "pedido"
                ? registro.valor
                : registro.total;

            return `
                <div class="historico-item">
                    <div>
                        <strong>
                            ${escaparHTML(numero)} ·
                            ${escaparHTML(descricao)}
                        </strong>

                        <span>
                            ${escaparHTML(formatarDataHistorico(data))}
                        </span>
                    </div>

                    <div class="historico-item-detalhes">
                        <strong>
                            ${escaparHTML(formatarMoeda(valor))}
                        </strong>

                        <span>
                            ${escaparHTML(registro.status || "Sem status")}
                        </span>
                    </div>
                </div>
            `;
        }).join("")
        : '<p class="historico-vazio">Nenhum registro encontrado.</p>';

    return `
        <div class="historico-grupo">
            <h4>${titulo} (${registros.length})</h4>
            ${itens}
        </div>
    `;
}

function formatarDataHistorico(valor) {
    if (!valor) return "Data não informada";

    const data = String(valor).slice(0, 10);
    const partes = data.split("-");

    return partes.length === 3 && /^\d{4}$/.test(partes[0])
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : data;
}

function abrirFormulario() {
    const formulario = document.getElementById("formulario-cliente");
    const nome = document.getElementById("nome-cliente");

    if (!formulario) return;

    formulario.style.display = "block";

    setTimeout(() => {
        nome?.focus();
    }, 100);

    formulario.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function fecharFormulario() {
    const formulario = document.getElementById("formulario-cliente");
    const form = document.getElementById("form-cliente");

    form?.reset();

    if (formulario) {
        formulario.style.display = "none";
    }
}

async function salvarCliente(evento) {
    evento.preventDefault();

    const campoNome = document.getElementById("nome-cliente");
    const campoTelefone = document.getElementById("telefone-cliente");

    const nome = campoNome ? campoNome.value.trim() : "";
    const telefone = campoTelefone ? campoTelefone.value.trim() : "";

    if (!nome || /[0-9]/.test(nome)) {
        alert("Informe um nome sem números.");
        campoNome?.focus();
        return;
    }

    const quantidadeDigitos = telefone.replace(/\D/g, "").length;

    if (
        telefone &&
        quantidadeDigitos !== 10 &&
        quantidadeDigitos !== 11
    ) {
        alert("Informe um telefone com DDD e 10 ou 11 dígitos.");
        campoTelefone?.focus();
        return;
    }

    const botao = document.getElementById("btn-salvar-cliente");
    const textoOriginal = botao ? botao.textContent : "";

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Salvando...";
    }

    const dados = {
        nome,
        telefone: telefone || null
    };

    try {
        const resposta = await fetch("/api/clientes", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível cadastrar o cliente."
            );
        }

        fecharFormulario();
        await carregarClientes();

        let clienteCriado = null;

        if (resultado.id) {
            clienteCriado = todosOsClientes.find(
                cliente =>
                    Number(cliente.id) === Number(resultado.id)
            );
        }

        if (!clienteCriado) {
            clienteCriado = [...todosOsClientes]
                .reverse()
                .find(cliente => {
                    const mesmoNome =
                        String(cliente.nome || "").toLowerCase() ===
                        nome.toLowerCase();

                    const mesmoTelefone =
                        String(cliente.telefone || "") ===
                        String(telefone || "");

                    return mesmoNome && mesmoTelefone;
                });
        }

        if (clienteCriado) {
            selecionarCliente(clienteCriado.id);
        } else {
            alert("Cliente cadastrado com sucesso!");
        }
    } catch (erro) {
        console.error("Erro ao cadastrar cliente:", erro);

        alert(
            erro.message ||
            "Ocorreu um erro ao cadastrar o cliente."
        );
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    }
}

function aplicarBusca(texto) {
    const busca = String(texto || "").trim().toLowerCase();

    if (!busca) {
        renderizarClientes(todosOsClientes);
        return;
    }

    const clientesFiltrados = todosOsClientes.filter(cliente => {
        const nome = String(cliente.nome || "").toLowerCase();
        const telefone = String(cliente.telefone || "").toLowerCase();

        return nome.includes(busca) || telefone.includes(busca);
    });

    renderizarClientes(clientesFiltrados);
}

async function excluirCliente(id) {
    const cliente = todosOsClientes.find(
        item => Number(item.id) === Number(id)
    );

    if (!cliente) return;

    const confirmou = confirm(
        `Deseja realmente excluir o cliente "${cliente.nome}"?`
    );

    if (!confirmou) return;

    try {
        const resposta = await fetch(`/api/clientes/${id}`, {
            method: "DELETE"
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível excluir o cliente."
            );
        }

        if (
            clienteSelecionado &&
            Number(clienteSelecionado.id) === Number(id)
        ) {
            removerSelecao();
        }

        await carregarClientes();
    } catch (erro) {
        console.error("Erro ao excluir cliente:", erro);

        alert(
            erro.message ||
            "Ocorreu um erro ao excluir o cliente."
        );
    }
}

function definirTexto(id, texto) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = texto;
    }
}

function formatarMoeda(valor) {
    const numero = Number(valor || 0);

    if (Number.isNaN(numero)) {
        return "R$ 0,00";
    }

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escaparHTML(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}