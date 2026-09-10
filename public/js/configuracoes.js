// ==========================================
// CONFIGURACOES.JS
// ==========================================

let dadosAtuais = [];
let tipoAtual = "pedidos";


// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        configurarAbas();

        configurarEventos();

        await carregarResumo();

        await carregarLogs();

        await carregarDados(
            tipoAtual
        );
    }
);


// ==========================================
// CONFIGURAR ABAS
// ==========================================

function configurarAbas() {

    const btnLogs =
        document.getElementById(
            "btn-aba-logs"
        );

    const btnDados =
        document.getElementById(
            "btn-aba-dados"
        );

    const abaLogs =
        document.getElementById(
            "aba-logs"
        );

    const abaDados =
        document.getElementById(
            "aba-dados"
        );


    btnLogs.addEventListener(
        "click",
        () => {

            abaLogs.style.display =
                "block";

            abaDados.style.display =
                "none";

            btnLogs.classList.remove(
                "btn-secondary"
            );

            btnLogs.classList.add(
                "btn-primary"
            );

            btnDados.classList.remove(
                "btn-primary"
            );

            btnDados.classList.add(
                "btn-secondary"
            );
        }
    );


    btnDados.addEventListener(
        "click",
        async () => {

            abaLogs.style.display =
                "none";

            abaDados.style.display =
                "block";

            btnDados.classList.remove(
                "btn-secondary"
            );

            btnDados.classList.add(
                "btn-primary"
            );

            btnLogs.classList.remove(
                "btn-primary"
            );

            btnLogs.classList.add(
                "btn-secondary"
            );

            await carregarDados(
                tipoAtual
            );
        }
    );
}


// ==========================================
// CONFIGURAR EVENTOS
// ==========================================

function configurarEventos() {

    const btnAtualizarLogs =
        document.getElementById(
            "btn-atualizar-logs"
        );

    const btnLimparFiltros =
        document.getElementById(
            "btn-limpar-filtros-log"
        );

    const filtroBusca =
        document.getElementById(
            "filtro-log-busca"
        );

    const filtroCategoria =
        document.getElementById(
            "filtro-log-categoria"
        );

    const filtroAcao =
        document.getElementById(
            "filtro-log-acao"
        );

    const tipoDado =
        document.getElementById(
            "tipo-dado"
        );

    const buscaDado =
        document.getElementById(
            "busca-dado"
        );

    const btnAtualizarDados =
        document.getElementById(
            "btn-atualizar-dados"
        );

    const btnApagarTudo =
        document.getElementById(
            "btn-apagar-tudo"
        );


    // ======================================
    // LOGS
    // ======================================

    btnAtualizarLogs.addEventListener(
        "click",
        carregarLogs
    );


    btnLimparFiltros.addEventListener(
        "click",
        async () => {

            filtroBusca.value =
                "";

            filtroCategoria.value =
                "";

            filtroAcao.value =
                "";

            await carregarLogs();
        }
    );


    filtroBusca.addEventListener(
        "input",
        debounce(
            carregarLogs,
            350
        )
    );


    filtroCategoria.addEventListener(
        "change",
        carregarLogs
    );


    filtroAcao.addEventListener(
        "change",
        carregarLogs
    );


    // ======================================
    // GERENCIAMENTO DE DADOS
    // ======================================

    tipoDado.addEventListener(
        "change",
        async () => {

            tipoAtual =
                tipoDado.value;

            buscaDado.value =
                "";

            await carregarDados(
                tipoAtual
            );
        }
    );


    buscaDado.addEventListener(
        "input",
        () => {

            renderizarDados();
        }
    );


    btnAtualizarDados.addEventListener(
        "click",
        async () => {

            await carregarDados(
                tipoAtual
            );
        }
    );


    // ======================================
    // ZONA DE PERIGO
    // ======================================

    document
        .querySelectorAll(
            "[data-limpar]"
        )
        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        const tipo =
                            botao.dataset.limpar;

                        limparCategoria(
                            tipo
                        );
                    }
                );
            }
        );


    btnApagarTudo.addEventListener(
        "click",
        apagarTudo
    );
}


// ==========================================
// CARREGAR RESUMO
// ==========================================

async function carregarResumo() {

    try {

        const resposta =
            await fetch(
                "/api/configuracoes/resumo"
            );

        const dados =
            await lerRespostaJson(
                resposta
            );

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Erro ao carregar resumo."
            );
        }


        definirTexto(
            "resumo-clientes",
            dados.clientes
        );

        definirTexto(
            "resumo-pedidos",
            dados.pedidos
        );

        definirTexto(
            "resumo-orcamentos",
            dados.orcamentos
        );

        definirTexto(
            "resumo-despesas",
            dados.despesas
        );

        definirTexto(
            "resumo-logs",
            dados.logs
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar resumo:",
            erro
        );
    }
}


// ==========================================
// CARREGAR LOGS
// ==========================================

async function carregarLogs() {

    const lista =
        document.getElementById(
            "lista-logs"
        );

    const busca =
        document
            .getElementById(
                "filtro-log-busca"
            )
            .value
            .trim();

    const categoria =
        document
            .getElementById(
                "filtro-log-categoria"
            )
            .value;

    const acao =
        document
            .getElementById(
                "filtro-log-acao"
            )
            .value;


    lista.innerHTML = `
        <tr>
            <td
                colspan="4"
                style="
                    padding: 20px;
                    text-align: center;
                    color: var(--text-light);
                "
            >
                Carregando histórico...
            </td>
        </tr>
    `;


    try {

        const parametros =
            new URLSearchParams();


        if (busca) {

            parametros.set(
                "busca",
                busca
            );
        }


        if (categoria) {

            parametros.set(
                "categoria",
                categoria
            );
        }


        if (acao) {

            parametros.set(
                "acao",
                acao
            );
        }


        let url =
            "/api/configuracoes/logs";


        const query =
            parametros.toString();


        if (query) {

            url +=
                `?${query}`;
        }


        const resposta =
            await fetch(
                url
            );


        const logs =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                logs.erro ||
                "Erro ao carregar histórico."
            );
        }


        renderizarLogs(
            Array.isArray(logs)
                ? logs
                : []
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar logs:",
            erro
        );


        lista.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    style="
                        padding: 20px;
                        text-align: center;
                        color: #dc2626;
                    "
                >
                    ${escaparHTML(
                        erro.message
                    )}
                </td>
            </tr>
        `;
    }
}


// ==========================================
// RENDERIZAR LOGS
// ==========================================

function renderizarLogs(
    logs
) {

    const lista =
        document.getElementById(
            "lista-logs"
        );


    if (
        !logs ||
        logs.length === 0
    ) {

        lista.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    style="
                        padding: 24px;
                        text-align: center;
                        color: var(--text-light);
                    "
                >
                    Nenhuma alteração encontrada.
                </td>
            </tr>
        `;

        return;
    }


    lista.innerHTML =
        logs
            .map(
                log => {

                    return `
                        <tr>

                            <td
                                style="
                                    padding: 12px;
                                    border-bottom: 1px solid var(--border);
                                    white-space: nowrap;
                                "
                            >
                                ${formatarDataHora(
                                    log.data_hora
                                )}
                            </td>


                            <td
                                style="
                                    padding: 12px;
                                    border-bottom: 1px solid var(--border);
                                "
                            >
                                ${criarBadgeCategoria(
                                    log.categoria
                                )}
                            </td>


                            <td
                                style="
                                    padding: 12px;
                                    border-bottom: 1px solid var(--border);
                                "
                            >
                                ${criarBadgeAcao(
                                    log.acao
                                )}
                            </td>


                            <td
                                style="
                                    padding: 12px;
                                    border-bottom: 1px solid var(--border);
                                    min-width: 280px;
                                "
                            >
                                ${escaparHTML(
                                    log.descricao
                                )}
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// ==========================================
// BADGE DE CATEGORIA
// ==========================================

function criarBadgeCategoria(
    categoria
) {

    return `
        <span
            style="
                display: inline-block;
                padding: 5px 9px;
                border-radius: 999px;
                border: 1px solid var(--border);
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
            "
        >
            ${escaparHTML(
                categoria
            )}
        </span>
    `;
}


// ==========================================
// BADGE DE AÇÃO
// ==========================================

function criarBadgeAcao(
    acao
) {

    let estilo =
        `
            display: inline-block;
            padding: 5px 9px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
        `;


    switch (acao) {

        case "Exclusão":
        case "Limpeza":

            estilo += `
                background: rgba(220, 38, 38, 0.10);
                color: #dc2626;
            `;

            break;


        case "Criação":

            estilo += `
                background: rgba(22, 163, 74, 0.10);
                color: #16a34a;
            `;

            break;


        case "Alteração":
        case "Status":

            estilo += `
                background: rgba(37, 99, 235, 0.10);
                color: #2563eb;
            `;

            break;


        case "Aprovação":

            estilo += `
                background: rgba(124, 58, 237, 0.10);
                color: #7c3aed;
            `;

            break;


        default:

            estilo += `
                border: 1px solid var(--border);
            `;
    }


    return `
        <span
            style="${estilo}"
        >
            ${escaparHTML(
                acao
            )}
        </span>
    `;
}


// ==========================================
// CARREGAR DADOS
// ==========================================

async function carregarDados(
    tipo
) {

    const lista =
        document.getElementById(
            "lista-dados"
        );


    lista.innerHTML = `
        <div
            style="
                padding: 20px;
                text-align: center;
                color: var(--text-light);
            "
        >
            Carregando...
        </div>
    `;


    atualizarTituloLista(
        tipo
    );


    try {

        const resposta =
            await fetch(
                `/api/configuracoes/dados/${tipo}`
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Erro ao carregar os dados."
            );
        }


        dadosAtuais =
            Array.isArray(resultado)
                ? resultado
                : [];


        renderizarDados();


    } catch (erro) {

        console.error(
            "Erro ao carregar dados:",
            erro
        );


        lista.innerHTML = `
            <div
                style="
                    padding: 20px;
                    text-align: center;
                    color: #dc2626;
                "
            >
                ${escaparHTML(
                    erro.message
                )}
            </div>
        `;
    }
}


// ==========================================
// ATUALIZAR TÍTULO
// ==========================================

function atualizarTituloLista(
    tipo
) {

    const titulo =
        document.getElementById(
            "titulo-lista-dados"
        );


    const titulos = {

        pedidos:
            "Pedidos",

        orcamentos:
            "Orçamentos",

        clientes:
            "Clientes",

        despesas:
            "Despesas"
    };


    titulo.textContent =
        titulos[tipo] ||
        "Dados";
}


// ==========================================
// RENDERIZAR DADOS
// ==========================================

function renderizarDados() {

    const lista =
        document.getElementById(
            "lista-dados"
        );


    const busca =
        document
            .getElementById(
                "busca-dado"
            )
            .value
            .trim()
            .toLowerCase();


    let dados =
        dadosAtuais;


    if (busca) {

        dados =
            dadosAtuais.filter(
                item => {

                    return Object
                        .values(item)
                        .some(
                            valor => {

                                return String(
                                    valor ?? ""
                                )
                                    .toLowerCase()
                                    .includes(
                                        busca
                                    );
                            }
                        );
                }
            );
    }


    if (
        dados.length === 0
    ) {

        lista.innerHTML = `
            <div
                style="
                    padding: 24px;
                    text-align: center;
                    color: var(--text-light);
                "
            >
                Nenhum registro encontrado.
            </div>
        `;

        return;
    }


    lista.innerHTML =
        dados
            .map(
                item => {

                    return criarItemDado(
                        item,
                        tipoAtual
                    );
                }
            )
            .join("");


    document
        .querySelectorAll(
            ".btn-excluir-registro"
        )
        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        const id =
                            botao.dataset.id;

                        excluirRegistro(
                            tipoAtual,
                            id
                        );
                    }
                );
            }
        );
}


// ==========================================
// CRIAR ITEM
// ==========================================

function criarItemDado(
    item,
    tipo
) {

    let titulo =
        "";

    let detalhes =
        "";


    // ======================================
    // PEDIDOS
    // ======================================

    if (
        tipo === "pedidos"
    ) {

        titulo =
            `Pedido #${item.numero_pedido}`;

        detalhes = `
            Cliente: ${escaparHTML(
                item.cliente_nome
            )}
            •
            ${escaparHTML(
                item.servico
            )}
            •
            ${numeroMoeda(
                item.valor
            )}
            •
            ${escaparHTML(
                item.status
            )}
        `;
    }


    // ======================================
    // ORÇAMENTOS
    // ======================================

    if (
        tipo === "orcamentos"
    ) {

        titulo =
            `Orçamento #${item.numero_orcamento}`;

        detalhes = `
            Cliente: ${escaparHTML(
                item.cliente_nome
            )}
            •
            ${numeroMoeda(
                item.total
            )}
            •
            ${escaparHTML(
                item.status
            )}
        `;


        if (
            item.pedido_id
        ) {

            detalhes += `
                • Convertido em pedido
            `;
        }
    }


    // ======================================
    // CLIENTES
    // ======================================

    if (
        tipo === "clientes"
    ) {

        titulo =
            item.nome;

        detalhes = `
            ${escaparHTML(
                item.telefone ||
                "Sem telefone"
            )}
            •
            ${Number(
                item.total_pedidos ||
                0
            )} pedido(s)
            •
            ${Number(
                item.total_orcamentos ||
                0
            )} orçamento(s)
        `;
    }


    // ======================================
    // DESPESAS
    // ======================================

    if (
        tipo === "despesas"
    ) {

        titulo =
            item.descricao;

        detalhes = `
            ${escaparHTML(
                item.categoria
            )}
            •
            ${numeroMoeda(
                item.valor
            )}
            •
            ${formatarData(
                item.data
            )}
        `;
    }


    return `
        <div
            style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                padding: 15px;
                border: 1px solid var(--border);
                border-radius: 10px;
                flex-wrap: wrap;
            "
        >

            <div
                style="
                    flex: 1;
                    min-width: 220px;
                "
            >

                <div
                    style="
                        font-weight: 600;
                        margin-bottom: 6px;
                    "
                >
                    ${escaparHTML(
                        titulo
                    )}
                </div>


                <div
                    style="
                        font-size: 13px;
                        color: var(--text-light);
                        line-height: 1.6;
                    "
                >
                    ${detalhes}
                </div>

            </div>


            <button
                type="button"
                class="btn btn-danger btn-excluir-registro"
                data-id="${item.id}"
            >
                Excluir
            </button>

        </div>
    `;
}


// ==========================================
// EXCLUIR UM REGISTRO
// ==========================================

async function excluirRegistro(
    tipo,
    id
) {

    const item =
        dadosAtuais.find(
            dado =>
                String(
                    dado.id
                ) ===
                String(id)
        );


    if (!item) {

        return;
    }


    const descricao =
        obterDescricaoConfirmacao(
            item,
            tipo
        );


    const mensagem =
        obterAvisoExclusao(
            item,
            tipo
        );


    const primeiraConfirmacao =
        confirm(
            `${mensagem}\n\n${descricao}\n\nEssa ação não pode ser desfeita.`
        );


    if (!primeiraConfirmacao) {

        return;
    }


    const segundaConfirmacao =
        confirm(
            "Tem certeza que deseja excluir este registro?"
        );


    if (!segundaConfirmacao) {

        return;
    }


    try {

        const resposta =
            await fetch(
                `/api/configuracoes/dados/${tipo}/${id}`,
                {
                    method:
                        "DELETE"
                }
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Erro ao excluir registro."
            );
        }


        alert(
            resultado.mensagem ||
            "Registro excluído com sucesso."
        );


        await atualizarTudo();


    } catch (erro) {

        console.error(
            "Erro ao excluir:",
            erro
        );


        alert(
            erro.message ||
            "Não foi possível excluir o registro."
        );
    }
}


// ==========================================
// AVISO DE EXCLUSÃO
// ==========================================

function obterAvisoExclusao(
    item,
    tipo
) {

    if (
        tipo === "clientes"
    ) {

        const pedidos =
            Number(
                item.total_pedidos ||
                0
            );

        const orcamentos =
            Number(
                item.total_orcamentos ||
                0
            );


        if (
            pedidos > 0 ||
            orcamentos > 0
        ) {

            return (
                "ATENÇÃO: excluir este cliente também apagará " +
                `${pedidos} pedido(s) e ` +
                `${orcamentos} orçamento(s) vinculados.`
            );
        }
    }


    if (
        tipo === "pedidos"
    ) {

        return (
            "Se este pedido tiver sido criado a partir de um orçamento, " +
            "o orçamento será desvinculado e voltará para Pendente."
        );
    }


    if (
        tipo === "orcamentos" &&
        item.pedido_id
    ) {

        return (
            "Este orçamento já está relacionado a um pedido. " +
            "A exclusão removerá somente o orçamento."
        );
    }


    return (
        "Você está prestes a excluir este registro."
    );
}


// ==========================================
// DESCRIÇÃO PARA CONFIRMAÇÃO
// ==========================================

function obterDescricaoConfirmacao(
    item,
    tipo
) {

    switch (tipo) {

        case "pedidos":

            return (
                `Pedido #${item.numero_pedido} — ` +
                `${item.cliente_nome}`
            );


        case "orcamentos":

            return (
                `Orçamento #${item.numero_orcamento} — ` +
                `${item.cliente_nome}`
            );


        case "clientes":

            return (
                `Cliente: ${item.nome}`
            );


        case "despesas":

            return (
                `Despesa: ${item.descricao} — ` +
                `${numeroMoeda(item.valor)}`
            );


        default:

            return (
                "Registro selecionado"
            );
    }
}


// ==========================================
// LIMPAR CATEGORIA
// ==========================================

async function limparCategoria(
    tipo
) {

    const nomes = {

        pedidos:
            "todos os pedidos",

        orcamentos:
            "todos os orçamentos",

        despesas:
            "todas as despesas",

        clientes:
            "todos os clientes",

        logs:
            "todo o histórico de alterações"
    };


    const quantidade =
        obterQuantidadeResumo(
            tipo
        );


    if (
        quantidade === 0
    ) {

        alert(
            "Não existem registros para apagar."
        );

        return;
    }


    let aviso =
        `Você está prestes a apagar ${nomes[tipo]}.`;


    if (
        tipo === "clientes"
    ) {

        aviso +=
            "\n\nATENÇÃO: isso também apagará todos os pedidos e orçamentos vinculados aos clientes.";
    }


    if (
        tipo === "pedidos"
    ) {

        aviso +=
            "\n\nOrçamentos ligados a esses pedidos voltarão para Pendente.";
    }


    aviso +=
        `\n\nQuantidade atual: ${quantidade}.`;


    const continuar =
        confirm(
            aviso
        );


    if (!continuar) {

        return;
    }


    const textoEsperado =
        `APAGAR ${tipo.toUpperCase()}`;


    const confirmacao =
        prompt(
            `Para confirmar, digite exatamente:\n\n${textoEsperado}`
        );


    if (
        confirmacao === null
    ) {

        return;
    }


    if (
        confirmacao.trim() !==
        textoEsperado
    ) {

        alert(
            "Texto de confirmação incorreto."
        );

        return;
    }


    try {

        const resposta =
            await fetch(
                `/api/configuracoes/limpar/${tipo}`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            confirmacao:
                                confirmacao.trim()
                        })
                }
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Erro ao apagar os dados."
            );
        }


        alert(
            resultado.mensagem ||
            "Dados apagados com sucesso."
        );


        await atualizarTudo();


    } catch (erro) {

        console.error(
            "Erro ao limpar categoria:",
            erro
        );


        alert(
            erro.message ||
            "Não foi possível apagar os dados."
        );
    }
}


// ==========================================
// APAGAR TUDO
// ==========================================

async function apagarTudo() {

    const campo =
        document.getElementById(
            "confirmacao-apagar-tudo"
        );


    const confirmacao =
        campo.value.trim();


    if (
        confirmacao !==
        "APAGAR TUDO"
    ) {

        alert(
            'Digite exatamente "APAGAR TUDO" para continuar.'
        );

        campo.focus();

        return;
    }


    const primeiraConfirmacao =
        confirm(
            "ATENÇÃO!\n\nIsso apagará TODOS os clientes, pedidos, orçamentos, despesas e logs do sistema.\n\nNão existe desfazer."
        );


    if (!primeiraConfirmacao) {

        return;
    }


    const segundaConfirmacao =
        confirm(
            "Última confirmação:\n\nDeseja realmente deixar o sistema completamente vazio?"
        );


    if (!segundaConfirmacao) {

        return;
    }


    try {

        const botao =
            document.getElementById(
                "btn-apagar-tudo"
            );


        const textoOriginal =
            botao.textContent;


        botao.disabled =
            true;


        botao.textContent =
            "Apagando...";


        const resposta =
            await fetch(
                "/api/configuracoes/apagar-tudo",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            confirmacao:
                                "APAGAR TUDO"
                        })
                }
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Erro ao apagar os dados."
            );
        }


        campo.value =
            "";


        alert(
            resultado.mensagem ||
            "Todos os dados foram apagados."
        );


        await atualizarTudo();


        botao.disabled =
            false;


        botao.textContent =
            textoOriginal;


    } catch (erro) {

        console.error(
            "Erro ao apagar tudo:",
            erro
        );


        alert(
            erro.message ||
            "Não foi possível apagar os dados."
        );


        const botao =
            document.getElementById(
                "btn-apagar-tudo"
            );


        botao.disabled =
            false;


        botao.textContent =
            "Apagar todos os dados";
    }
}


// ==========================================
// ATUALIZAR TUDO
// ==========================================

async function atualizarTudo() {

    await carregarResumo();

    await carregarLogs();

    await carregarDados(
        tipoAtual
    );
}


// ==========================================
// OBTER QUANTIDADE DO RESUMO
// ==========================================

function obterQuantidadeResumo(
    tipo
) {

    const mapa = {

        clientes:
            "resumo-clientes",

        pedidos:
            "resumo-pedidos",

        orcamentos:
            "resumo-orcamentos",

        despesas:
            "resumo-despesas",

        logs:
            "resumo-logs"
    };


    const elemento =
        document.getElementById(
            mapa[tipo]
        );


    if (!elemento) {

        return 0;
    }


    return Number(
        elemento.textContent ||
        0
    );
}


// ==========================================
// DEFINIR TEXTO
// ==========================================

function definirTexto(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (!elemento) {

        return;
    }


    elemento.textContent =
        Number(
            valor ||
            0
        ).toLocaleString(
            "pt-BR"
        );
}


// ==========================================
// FORMATAR MOEDA
// ==========================================

function numeroMoeda(
    valor
) {

    return Number(
        valor ||
        0
    ).toLocaleString(
        "pt-BR",
        {
            style:
                "currency",

            currency:
                "BRL"
        }
    );
}


// ==========================================
// FORMATAR DATA
// ==========================================

function formatarData(
    data
) {

    if (!data) {

        return "—";
    }


    const partes =
        String(
            data
        ).split(
            "-"
        );


    if (
        partes.length !== 3
    ) {

        return escaparHTML(
            data
        );
    }


    return (
        `${partes[2]}/` +
        `${partes[1]}/` +
        `${partes[0]}`
    );
}


// ==========================================
// FORMATAR DATA E HORA
// ==========================================

function formatarDataHora(
    data
) {

    if (!data) {

        return "—";
    }


    let valor =
        String(
            data
        );


    // SQLite costuma retornar:
    // YYYY-MM-DD HH:MM:SS

    if (
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
            valor
        )
    ) {

        valor =
            valor.replace(
                " ",
                "T"
            );
    }


    const dataObj =
        new Date(
            valor
        );


    if (
        Number.isNaN(
            dataObj.getTime()
        )
    ) {

        return escaparHTML(
            data
        );
    }


    return dataObj.toLocaleString(
        "pt-BR",
        {
            dateStyle:
                "short",

            timeStyle:
                "short"
        }
    );
}


// ==========================================
// JSON SEGURO
// ==========================================

async function lerRespostaJson(
    resposta
) {

    const texto =
        await resposta.text();


    if (!texto) {

        return {};
    }


    try {

        return JSON.parse(
            texto
        );

    } catch {

        return {
            erro:
                texto
        };
    }
}


// ==========================================
// DEBOUNCE
// ==========================================

function debounce(
    funcao,
    tempo
) {

    let timer;


    return function (
        ...args
    ) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {

                    funcao(
                        ...args
                    );

                },
                tempo
            );
    };
}


// ==========================================
// ESCAPAR HTML
// ==========================================

function escaparHTML(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";
    }


    return String(
        valor
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}