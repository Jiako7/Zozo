// ==========================================
// PEDIDO.JS
// ==========================================

let pedidoId = null;
let modoEdicao = false;


// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const parametros =
            new URLSearchParams(
                window.location.search
            );

        pedidoId =
            parametros.get("id");

        modoEdicao =
            Boolean(pedidoId);


        configurarPagina();


        await carregarClientes();


        if (modoEdicao) {

            await carregarPedido(
                pedidoId
            );

        } else {

            definirDataEntrada();

            configurarPedidoNovo();
        }
    }
);


// ==========================================
// CONFIGURAR PÁGINA
// ==========================================

function configurarPagina() {

    const titulo =
        document.getElementById(
            "titulo-pagina"
        );

    const subtitulo =
        document.getElementById(
            "subtitulo-pagina"
        );

    const botao =
        document.getElementById(
            "btn-salvar"
        );

    const formulario =
        document.getElementById(
            "form-pedido"
        );


    if (modoEdicao) {

        if (titulo) {
            titulo.textContent =
                "Editar pedido";
        }

        if (subtitulo) {
            subtitulo.textContent =
                "Atualize as informações do pedido";
        }

        if (botao) {
            botao.textContent =
                "Atualizar pedido";
        }

    } else {

        if (titulo) {
            titulo.textContent =
                "Novo pedido";
        }

        if (subtitulo) {
            subtitulo.textContent =
                "Cadastre um novo pedido";
        }

        if (botao) {
            botao.textContent =
                "Salvar pedido";
        }
    }


    if (formulario) {

        formulario.addEventListener(
            "submit",
            salvarPedido
        );
    }
}


// ==========================================
// CONFIGURAÇÕES DE PEDIDO NOVO
// ==========================================

function configurarPedidoNovo() {

    const numero =
        document.getElementById(
            "numero-pedido"
        );

    const status =
        document.getElementById(
            "status"
        );

    const pagamento =
        document.getElementById(
            "situacao-pagamento"
        );


    if (numero) {

        numero.value =
            "Automático";
    }


    if (status) {

        status.value =
            "Aguardando";
    }


    if (pagamento) {

        pagamento.value =
            "Pendente";
    }
}


// ==========================================
// CARREGAR CLIENTES
// ==========================================

async function carregarClientes() {

    const select =
        document.getElementById(
            "cliente"
        );


    if (!select) {

        console.error(
            'Elemento <select id="cliente"> não encontrado.'
        );

        return false;
    }


    try {

        const resposta =
            await fetch(
                "/api/clientes"
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Erro ao carregar clientes."
            );
        }


        select.innerHTML =
            "";


        const opcaoPadrao =
            document.createElement(
                "option"
            );


        opcaoPadrao.value =
            "";


        opcaoPadrao.textContent =
            "Selecione um cliente";


        select.appendChild(
            opcaoPadrao
        );


        if (
            Array.isArray(resultado) &&
            resultado.length > 0
        ) {

            resultado.forEach(
                cliente => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        String(
                            cliente.id
                        );


                    option.textContent =
                        cliente.telefone
                            ? `${cliente.nome} — ${cliente.telefone}`
                            : cliente.nome;


                    select.appendChild(
                        option
                    );
                }
            );

        } else {

            const opcaoVazia =
                document.createElement(
                    "option"
                );


            opcaoVazia.value =
                "";


            opcaoVazia.textContent =
                "Nenhum cliente cadastrado";


            opcaoVazia.disabled =
                true;


            select.appendChild(
                opcaoVazia
            );
        }


        return true;


    } catch (erro) {

        console.error(
            "Erro ao carregar clientes:",
            erro
        );


        select.innerHTML =
            "";


        const opcaoErro =
            document.createElement(
                "option"
            );


        opcaoErro.value =
            "";


        opcaoErro.textContent =
            "Erro ao carregar clientes";


        select.appendChild(
            opcaoErro
        );


        return false;
    }
}


// ==========================================
// DATA DE ENTRADA
// ==========================================

function definirDataEntrada() {

    const campo =
        document.getElementById(
            "data-entrada"
        );


    if (!campo) {
        return;
    }


    if (campo.value) {
        return;
    }


    const hoje =
        new Date();


    const ano =
        hoje.getFullYear();


    const mes =
        String(
            hoje.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const dia =
        String(
            hoje.getDate()
        ).padStart(
            2,
            "0"
        );


    campo.value =
        `${ano}-${mes}-${dia}`;
}


// ==========================================
// CARREGAR PEDIDO
// ==========================================

async function carregarPedido(id) {

    try {

        const resposta =
            await fetch(
                `/api/pedidos/${id}`
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Pedido não encontrado."
            );
        }


        if (!resultado.pedido) {

            throw new Error(
                "Os dados do pedido não foram encontrados."
            );
        }


        preencherFormulario(
            resultado.pedido
        );


        carregarHistorico(
            resultado.historico ||
            []
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar pedido:",
            erro
        );


        alert(
            erro.message ||
            "Não foi possível carregar o pedido."
        );


        window.location.href =
            "pedidos.html";
    }
}


// ==========================================
// PREENCHER FORMULÁRIO
// ==========================================

function preencherFormulario(
    pedido
) {

    definirValorCampo(
        "numero-pedido",
        pedido.numero_pedido ||
        "—"
    );


    definirValorCampo(
        "cliente",
        pedido.cliente_id != null
            ? String(
                pedido.cliente_id
            )
            : ""
    );


    definirValorCampo(
        "servico",
        pedido.servico ||
        ""
    );


    definirValorCampo(
        "descricao",
        pedido.descricao ||
        ""
    );


    definirValorCampo(
        "data-entrada",
        pedido.data_entrada ||
        ""
    );


    definirValorCampo(
        "data-entrega",
        pedido.data_entrega ||
        ""
    );


    definirValorCampo(
        "data-conclusao",
        pedido.data_conclusao ||
        ""
    );


    definirValorCampo(
        "valor",
        pedido.valor ?? ""
    );


    definirValorCampo(
        "forma-pagamento",
        pedido.forma_pagamento ||
        ""
    );


    definirValorCampo(
        "situacao-pagamento",
        pedido.situacao_pagamento ||
        "Pendente"
    );


    definirValorCampo(
        "status",
        pedido.status ||
        "Aguardando"
    );


    definirValorCampo(
        "observacoes",
        pedido.observacoes ||
        ""
    );


    // Caso seja um pedido vindo de orçamento,
    // a data de entrega pode ainda não existir.

    if (
        !pedido.data_entrega
    ) {

        const campoEntrega =
            document.getElementById(
                "data-entrega"
            );


        if (campoEntrega) {

            campoEntrega.classList.add(
                "campo-pendente"
            );

            campoEntrega.title =
                "Defina a data prevista de entrega quando ela for combinada.";
        }
    }
}


// ==========================================
// DEFINIR VALOR DE CAMPO
// ==========================================

function definirValorCampo(
    id,
    valor
) {

    const campo =
        document.getElementById(
            id
        );


    if (!campo) {

        console.warn(
            `Campo #${id} não encontrado.`
        );

        return;
    }


    campo.value =
        valor;
}


// ==========================================
// OBTER VALOR DE CAMPO
// ==========================================

function obterValorCampo(
    id
) {

    const campo =
        document.getElementById(
            id
        );


    if (!campo) {
        return "";
    }


    return campo.value;
}


// ==========================================
// SALVAR PEDIDO
// ==========================================

async function salvarPedido(
    evento
) {

    evento.preventDefault();


    const clienteId =
        obterValorCampo(
            "cliente"
        );


    const servico =
        obterValorCampo(
            "servico"
        ).trim();


    const descricao =
        obterValorCampo(
            "descricao"
        ).trim();


    const dataEntrada =
        obterValorCampo(
            "data-entrada"
        );


    const dataEntrega =
        obterValorCampo(
            "data-entrega"
        );


    const dataConclusao =
        obterValorCampo(
            "data-conclusao"
        );


    const valorTexto =
        obterValorCampo(
            "valor"
        );


    const formaPagamento =
        obterValorCampo(
            "forma-pagamento"
        );


    const situacaoPagamento =
        obterValorCampo(
            "situacao-pagamento"
        );


    const status =
        obterValorCampo(
            "status"
        );


    const observacoes =
        obterValorCampo(
            "observacoes"
        ).trim();


    // ======================================
    // VALIDAÇÕES
    // ======================================

    if (!clienteId) {

        alert(
            "Selecione um cliente."
        );

        return;
    }


    if (!servico) {

        alert(
            "Informe o serviço solicitado."
        );

        return;
    }


    if (!dataEntrada) {

        alert(
            "Informe a data de entrada."
        );

        return;
    }


    const valor =
        Number(
            valorTexto
        );


    if (
        valorTexto === "" ||
        Number.isNaN(valor) ||
        valor < 0
    ) {

        alert(
            "Informe um valor válido."
        );

        return;
    }


    if (
        dataEntrega &&
        dataEntrada &&
        dataEntrega < dataEntrada
    ) {

        alert(
            "A data prevista de entrega não pode ser anterior à data de entrada."
        );

        return;
    }


    if (
        dataConclusao &&
        dataEntrada &&
        dataConclusao < dataEntrada
    ) {

        alert(
            "A data de conclusão não pode ser anterior à data de entrada."
        );

        return;
    }


    if (
        status === "Entregue" &&
        !dataConclusao
    ) {

        const continuar =
            confirm(
                "O pedido está marcado como Entregue, mas não possui data de conclusão.\n\nDeseja continuar mesmo assim?"
            );


        if (!continuar) {
            return;
        }
    }


    // ======================================
    // DADOS
    // ======================================

    const dados = {

        cliente_id:
            Number(
                clienteId
            ),

        servico:
            servico,

        descricao:
            descricao ||
            null,

        data_entrada:
            dataEntrada,

        data_entrega:
            dataEntrega ||
            null,

        data_conclusao:
            dataConclusao ||
            null,

        valor:
            valor,

        forma_pagamento:
            formaPagamento ||
            null,

        situacao_pagamento:
            situacaoPagamento ||
            "Pendente",

        status:
            status ||
            "Aguardando",

        observacoes:
            observacoes ||
            null
    };


    const botao =
        document.getElementById(
            "btn-salvar"
        );


    const textoOriginal =
        botao
            ? botao.textContent
            : "";


    try {

        if (botao) {

            botao.disabled =
                true;


            botao.textContent =
                modoEdicao
                    ? "Atualizando..."
                    : "Salvando...";
        }


        const url =
            modoEdicao
                ? `/api/pedidos/${pedidoId}`
                : "/api/pedidos";


        const metodo =
            modoEdicao
                ? "PUT"
                : "POST";


        const resposta =
            await fetch(
                url,
                {

                    method:
                        metodo,

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            dados
                        )
                }
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                resultado.detalhe ||
                "Não foi possível salvar o pedido."
            );
        }


        // ==================================
        // SUCESSO
        // ==================================

        if (modoEdicao) {

            alert(
                "Pedido atualizado com sucesso!"
            );


            await carregarPedido(
                pedidoId
            );


            if (botao) {

                botao.textContent =
                    "Atualizar pedido";
            }

        } else {

            alert(
                `Pedido #${resultado.numero_pedido || ""} criado com sucesso!`
            );


            window.location.href =
                `pedido.html?id=${resultado.id}`;
        }


    } catch (erro) {

        console.error(
            "Erro ao salvar pedido:",
            erro
        );


        alert(
            erro.message ||
            "Ocorreu um erro ao salvar o pedido."
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;


            if (modoEdicao) {

                botao.textContent =
                    "Atualizar pedido";

            } else {

                botao.textContent =
                    textoOriginal ||
                    "Salvar pedido";
            }
        }
    }
}


// ==========================================
// HISTÓRICO DE STATUS
// ==========================================

function carregarHistorico(
    historico
) {

    const secao =
        document.getElementById(
            "secao-historico"
        );


    const container =
        document.getElementById(
            "historico-status"
        );


    if (
        !secao ||
        !container
    ) {

        return;
    }


    if (
        !Array.isArray(
            historico
        ) ||
        historico.length === 0
    ) {

        secao.style.display =
            "none";

        container.innerHTML =
            "";

        return;
    }


    secao.style.display =
        "block";


    container.innerHTML =
        historico
            .map(
                item => {

                    return `
                        <div
                            class="status-history-item"
                            style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                gap: 15px;
                                padding: 14px 0;
                                border-bottom: 1px solid var(--border);
                                flex-wrap: wrap;
                            "
                        >

                            <div>
                                ${criarStatus(
                                    item.status
                                )}
                            </div>

                            <span
                                style="
                                    color: var(--text-light);
                                    font-size: 14px;
                                "
                            >
                                ${formatarDataHora(
                                    item.data_hora
                                )}
                            </span>

                        </div>
                    `;
                }
            )
            .join("");
}


// ==========================================
// STATUS
// ==========================================

function criarStatus(
    status
) {

    let classe =
        "";


    switch (
        status
    ) {

        case "Aguardando":

            classe =
                "status-aguardando";

            break;


        case "Em andamento":

            classe =
                "status-andamento";

            break;


        case "Pronto":

            classe =
                "status-pronto";

            break;


        case "Entregue":

            classe =
                "status-entregue";

            break;
    }


    return `
        <span class="status ${classe}">
            ${escaparHTML(
                status ||
                "—"
            )}
        </span>
    `;
}


// ==========================================
// DATA E HORA
// ==========================================

function formatarDataHora(
    data
) {

    if (!data) {
        return "—";
    }


    // SQLite normalmente retorna:
    // YYYY-MM-DD HH:MM:SS
    //
    // Transformamos para um formato que
    // o navegador interpreta melhor.

    let valor =
        String(
            data
        );


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
// RESPOSTA JSON SEGURA
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