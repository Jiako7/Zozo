let financeiroChart = null;
let pagamentosChart = null;
let desempenhoChart = null;

let periodoDesempenhoAtual = "semanal";


document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("form-despesa");

    if (formulario) {
        formulario.addEventListener("submit", salvarDespesa);
    }


    document
        .getElementById("btn-nova-despesa")
        ?.addEventListener("click", abrirFormularioDespesa);


    document
        .getElementById("btn-cancelar-despesa")
        ?.addEventListener("click", fecharFormularioDespesa);


    definirDataDespesa();

    configurarDesempenho();

    carregarFinanceiro();

    carregarDesempenho("semanal");

});


/* =========================================================
   FINANCEIRO PRINCIPAL
   ========================================================= */

async function carregarFinanceiro() {

    try {

        const resposta = await fetch("/api/dashboard");

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar os dados financeiros."
            );
        }


        const dados = await resposta.json();


        atualizarResumo(dados);

        criarGraficoFinanceiro(
            dados.financeiro
        );

        criarGraficoPagamentos(
            dados.financeiro
        );


        await carregarDespesas();


    } catch (erro) {

        console.error(
            "Erro ao carregar financeiro:",
            erro
        );

        mostrarErro();

    }

}


/* =========================================================
   RESUMO FINANCEIRO
   ========================================================= */

function atualizarResumo(dados) {

    const financeiro = dados.financeiro || {};


    const faturamento =
        Number(financeiro.faturamento || 0);

    const recebido =
        Number(financeiro.recebido || 0);

    const pendente =
        Number(financeiro.pendente || 0);

    const despesas =
        Number(financeiro.despesas || 0);

    const saldo =
        Number(financeiro.saldo || 0);


    document.getElementById(
        "faturamento"
    ).textContent =
        formatarMoeda(faturamento);


    document.getElementById(
        "total-recebido"
    ).textContent =
        formatarMoeda(recebido);


    document.getElementById(
        "total-pendente"
    ).textContent =
        formatarMoeda(pendente);


    document.getElementById(
        "total-despesas"
    ).textContent =
        formatarMoeda(despesas);


    document.getElementById(
        "saldo"
    ).textContent =
        formatarMoeda(saldo);

}


/* =========================================================
   GRÁFICO RECEITAS X DESPESAS
   ========================================================= */

function criarGraficoFinanceiro(financeiro) {

    const canvas =
        document.getElementById(
            "financeiroChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    if (financeiroChart) {
        financeiroChart.destroy();
    }


    const faturamento =
        Number(
            financeiro?.faturamento || 0
        );

    const despesas =
        Number(
            financeiro?.despesas || 0
        );


    financeiroChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: [
                        "Receitas",
                        "Despesas"
                    ],

                    datasets: [
                        {
                            label: "Valor",

                            data: [
                                faturamento,
                                despesas
                            ]
                        }
                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback: function(valor) {
                                    return formatarMoeda(valor);
                                }

                            }

                        }

                    },


                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: function(contexto) {
                                    return formatarMoeda(
                                        contexto.raw
                                    );
                                }

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   GRÁFICO PAGAMENTOS
   ========================================================= */

function criarGraficoPagamentos(financeiro) {

    const canvas =
        document.getElementById(
            "pagamentosChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    if (pagamentosChart) {
        pagamentosChart.destroy();
    }


    const recebido =
        Number(
            financeiro?.recebido || 0
        );

    const pendente =
        Number(
            financeiro?.pendente || 0
        );


    pagamentosChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Recebido",
                        "Pendente"
                    ],

                    datasets: [
                        {

                            data: [
                                recebido,
                                pendente
                            ]

                        }
                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        },

                        tooltip: {

                            callbacks: {

                                label: function(contexto) {

                                    return (
                                        contexto.label +
                                        ": " +
                                        formatarMoeda(
                                            contexto.raw
                                        )
                                    );

                                }

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   REGISTRO DE DESEMPENHO
   ========================================================= */

function configurarDesempenho() {

    const botoes =
        document.querySelectorAll(
            ".btn-periodo-desempenho"
        );


    botoes.forEach(botao => {

        botao.addEventListener(
            "click",
            () => {

                const periodo =
                    botao.dataset.periodo;


                selecionarPeriodoDesempenho(
                    periodo
                );

            }
        );

    });


    document
        .getElementById(
            "btn-aplicar-periodo"
        )
        ?.addEventListener(
            "click",
            aplicarPeriodoPersonalizado
        );

}


/* =========================================================
   SELECIONAR PERÍODO
   ========================================================= */

function selecionarPeriodoDesempenho(periodo) {

    periodoDesempenhoAtual =
        periodo;


    const botoes =
        document.querySelectorAll(
            ".btn-periodo-desempenho"
        );


    botoes.forEach(botao => {

        const ativo =
            botao.dataset.periodo === periodo;


        botao.classList.toggle(
            "btn-primary",
            ativo
        );

        botao.classList.toggle(
            "btn-secondary",
            !ativo
        );

    });


    const personalizado =
        document.getElementById(
            "periodo-personalizado"
        );


    if (personalizado) {

        personalizado.style.display =
            periodo === "personalizado"
                ? "grid"
                : "none";

    }


    if (periodo === "personalizado") {

        definirDatasPersonalizadas();

        return;

    }


    carregarDesempenho(periodo);

}


/* =========================================================
   DATAS PERSONALIZADAS
   ========================================================= */

function definirDatasPersonalizadas() {

    const inicio =
        document.getElementById(
            "data-inicial-desempenho"
        );

    const fim =
        document.getElementById(
            "data-final-desempenho"
        );


    if (!inicio || !fim) {
        return;
    }


    if (!fim.value) {

        const hoje =
            new Date();

        fim.value =
            dataParaInput(hoje);

    }


    if (!inicio.value) {

        const data =
            new Date();

        data.setDate(
            data.getDate() - 30
        );

        inicio.value =
            dataParaInput(data);

    }

}


/* =========================================================
   APLICAR PERÍODO PERSONALIZADO
   ========================================================= */

function aplicarPeriodoPersonalizado() {

    const inicio =
        document.getElementById(
            "data-inicial-desempenho"
        )?.value;


    const fim =
        document.getElementById(
            "data-final-desempenho"
        )?.value;


    if (!inicio || !fim) {

        alert(
            "Informe a data inicial e a data final."
        );

        return;

    }


    if (inicio > fim) {

        alert(
            "A data inicial não pode ser maior que a data final."
        );

        return;

    }


    carregarDesempenho(
        "personalizado",
        inicio,
        fim
    );

}


/* =========================================================
   CARREGAR DESEMPENHO
   ========================================================= */

async function carregarDesempenho(
    periodo = "semanal",
    inicio = null,
    fim = null
) {

    try {

        mostrarCarregandoDesempenho();


        const parametros =
            new URLSearchParams();


        parametros.set(
            "periodo",
            periodo
        );


        if (
            periodo === "personalizado"
        ) {

            parametros.set(
                "inicio",
                inicio
            );

            parametros.set(
                "fim",
                fim
            );

        }


        const resposta =
            await fetch(
                `/api/financeiro/desempenho?${parametros.toString()}`
            );


        if (!resposta.ok) {

            let dadosErro = {};

            try {

                dadosErro =
                    await resposta.json();

            } catch {

                dadosErro = {};

            }


            throw new Error(
                dadosErro.erro ||
                "Não foi possível carregar o desempenho."
            );

        }


        const dados =
            await resposta.json();


        atualizarDesempenho(
            dados
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar desempenho:",
            erro
        );


        mostrarErroDesempenho();

    }

}


/* =========================================================
   ATUALIZAR DESEMPENHO
   ========================================================= */

function atualizarDesempenho(dados) {

    const atual =
        dados.atual ||
        dados.desempenho ||
        {};


    const anterior =
        dados.anterior ||
        {};


    const faturamento =
        Number(
            atual.faturamento || 0
        );

    const recebido =
        Number(
            atual.recebido || 0
        );

    const pendente =
        Number(
            atual.pendente || 0
        );

    const despesas =
        Number(
            atual.despesas || 0
        );


    const resultado =
        Number(
            atual.resultado ??
            atual.resultado_liquido ??
            recebido - despesas
        );


    const pedidos =
        Number(
            atual.pedidos ??
            atual.pedidos_criados ??
            0
        );


    const pedidosEntregues =
        Number(
            atual.pedidos_entregues || 0
        );


    const ticketMedio =
        Number(
            atual.ticket_medio ??
            (
                pedidos > 0
                    ? faturamento / pedidos
                    : 0
            )
        );


    const orcamentos =
        Number(
            atual.orcamentos ??
            atual.orcamentos_criados ??
            0
        );


    const orcamentosAprovados =
        Number(
            atual.orcamentos_aprovados || 0
        );


    const taxaAprovacao =
        Number(
            atual.taxa_aprovacao ??
            (
                orcamentos > 0
                    ? (
                        orcamentosAprovados /
                        orcamentos
                    ) * 100
                    : 0
            )
        );


    /* -----------------------------
       CARDS PRINCIPAIS
       ----------------------------- */

    definirTexto(
        "desempenho-faturamento",
        formatarMoeda(
            faturamento
        )
    );


    definirTexto(
        "desempenho-resultado",
        formatarMoeda(
            resultado
        )
    );


    definirTexto(
        "desempenho-pedidos",
        pedidos
    );


    definirTexto(
        "desempenho-ticket-medio",
        formatarMoeda(
            ticketMedio
        )
    );


    /* -----------------------------
       CARDS SECUNDÁRIOS
       ----------------------------- */

    definirTexto(
        "desempenho-recebido",
        formatarMoeda(
            recebido
        )
    );


    definirTexto(
        "desempenho-pendente",
        formatarMoeda(
            pendente
        )
    );


    definirTexto(
        "desempenho-despesas",
        formatarMoeda(
            despesas
        )
    );


    definirTexto(
        "desempenho-pedidos-entregues",
        pedidosEntregues
    );


    /* -----------------------------
       ORÇAMENTOS
       ----------------------------- */

    definirTexto(
        "desempenho-orcamentos",
        orcamentos
    );


    definirTexto(
        "desempenho-orcamentos-aprovados",
        orcamentosAprovados
    );


    definirTexto(
        "desempenho-taxa-aprovacao",
        formatarPercentual(
            taxaAprovacao
        )
    );


    /* -----------------------------
       RESUMO DETALHADO
       ----------------------------- */

    definirTexto(
        "resumo-pedidos-criados",
        pedidos
    );


    definirTexto(
        "resumo-pedidos-entregues",
        pedidosEntregues
    );


    definirTexto(
        "resumo-orcamentos-criados",
        orcamentos
    );


    definirTexto(
        "resumo-orcamentos-aprovados",
        orcamentosAprovados
    );


    definirTexto(
        "resumo-taxa-aprovacao",
        formatarPercentual(
            taxaAprovacao
        )
    );


    definirTexto(
        "resumo-ticket-medio",
        formatarMoeda(
            ticketMedio
        )
    );


    definirTexto(
        "resumo-faturamento",
        formatarMoeda(
            faturamento
        )
    );


    definirTexto(
        "resumo-recebido",
        formatarMoeda(
            recebido
        )
    );


    definirTexto(
        "resumo-pendente",
        formatarMoeda(
            pendente
        )
    );


    definirTexto(
        "resumo-despesas",
        formatarMoeda(
            despesas
        )
    );


    definirTexto(
        "resumo-resultado",
        formatarMoeda(
            resultado
        )
    );


    /* -----------------------------
       PERÍODO
       ----------------------------- */

    atualizarTextoPeriodo(
        dados
    );


    /* -----------------------------
       COMPARATIVOS
       ----------------------------- */

    atualizarComparativos(
        atual,
        anterior
    );


    /* -----------------------------
       COR DO RESULTADO
       ----------------------------- */

    atualizarClasseResultado(
        resultado
    );


    /* -----------------------------
       GRÁFICO
       ----------------------------- */

    criarGraficoDesempenho(
        dados.grafico || {}
    );

}


/* =========================================================
   ATUALIZAR TEXTO DO PERÍODO
   ========================================================= */

function atualizarTextoPeriodo(dados) {

    const elemento =
        document.getElementById(
            "periodo-desempenho-texto"
        );


    if (!elemento) {
        return;
    }


    const periodo =
        dados.periodo || {};


    const inicio =
        periodo.inicio ||
        dados.inicio;


    const fim =
        periodo.fim ||
        dados.fim;


    if (inicio && fim) {

        elemento.textContent =
            `${formatarData(inicio)} até ${formatarData(fim)}`;

        return;

    }


    const nomes = {

        semanal: "Semana atual",

        mensal: "Mês atual",

        semestral: "Últimos 6 meses",

        anual: "Ano atual",

        personalizado:
            "Período personalizado"

    };


    elemento.textContent =
        nomes[
            periodoDesempenhoAtual
        ] || "—";

}


/* =========================================================
   COMPARATIVOS
   ========================================================= */

function atualizarComparativos(
    atual,
    anterior
) {

    const faturamentoAtual =
        Number(
            atual.faturamento || 0
        );


    const faturamentoAnterior =
        Number(
            anterior.faturamento || 0
        );


    const resultadoAtual =
        Number(
            atual.resultado ??
            atual.resultado_liquido ??
            (
                Number(atual.recebido || 0) -
                Number(atual.despesas || 0)
            )
        );


    const resultadoAnterior =
        Number(
            anterior.resultado ??
            anterior.resultado_liquido ??
            (
                Number(anterior.recebido || 0) -
                Number(anterior.despesas || 0)
            )
        );


    const pedidosAtual =
        Number(
            atual.pedidos ??
            atual.pedidos_criados ??
            0
        );


    const pedidosAnterior =
        Number(
            anterior.pedidos ??
            anterior.pedidos_criados ??
            0
        );


    const ticketAtual =
        Number(
            atual.ticket_medio ??
            (
                pedidosAtual > 0
                    ? faturamentoAtual /
                      pedidosAtual
                    : 0
            )
        );


    const ticketAnterior =
        Number(
            anterior.ticket_medio ??
            (
                pedidosAnterior > 0
                    ? faturamentoAnterior /
                      pedidosAnterior
                    : 0
            )
        );


    atualizarComparativoPercentual(
        "comparativo-faturamento",
        faturamentoAtual,
        faturamentoAnterior
    );


    atualizarComparativoPercentual(
        "comparativo-resultado",
        resultadoAtual,
        resultadoAnterior
    );


    atualizarComparativoQuantidade(
        "comparativo-pedidos",
        pedidosAtual,
        pedidosAnterior
    );


    atualizarComparativoPercentual(
        "comparativo-ticket",
        ticketAtual,
        ticketAnterior
    );

}


/* =========================================================
   COMPARATIVO PERCENTUAL
   ========================================================= */

function atualizarComparativoPercentual(
    id,
    atual,
    anterior
) {

    const elemento =
        document.getElementById(id);


    if (!elemento) {
        return;
    }


    atual =
        Number(atual || 0);

    anterior =
        Number(anterior || 0);


    if (
        anterior === 0 &&
        atual === 0
    ) {

        elemento.textContent =
            "Sem alteração";

        definirCorComparativo(
            elemento,
            0
        );

        return;

    }


    if (anterior === 0) {

        elemento.textContent =
            atual > 0
                ? "Novo no período"
                : "Sem comparação";

        definirCorComparativo(
            elemento,
            atual
        );

        return;

    }


    const diferenca =
        (
            (
                atual - anterior
            ) /
            Math.abs(anterior)
        ) * 100;


    const sinal =
        diferenca > 0
            ? "+"
            : "";


    elemento.textContent =
        `${sinal}${diferenca.toFixed(1).replace(".", ",")}% em relação ao período anterior`;


    definirCorComparativo(
        elemento,
        diferenca
    );

}


/* =========================================================
   COMPARATIVO DE QUANTIDADE
   ========================================================= */

function atualizarComparativoQuantidade(
    id,
    atual,
    anterior
) {

    const elemento =
        document.getElementById(id);


    if (!elemento) {
        return;
    }


    const diferenca =
        Number(atual || 0) -
        Number(anterior || 0);


    if (diferenca === 0) {

        elemento.textContent =
            "Sem alteração";

        definirCorComparativo(
            elemento,
            0
        );

        return;

    }


    const sinal =
        diferenca > 0
            ? "+"
            : "";


    elemento.textContent =
        `${sinal}${diferenca} pedido${Math.abs(diferenca) === 1 ? "" : "s"} em relação ao período anterior`;


    definirCorComparativo(
        elemento,
        diferenca
    );

}


/* =========================================================
   COR DOS COMPARATIVOS
   ========================================================= */

function definirCorComparativo(
    elemento,
    valor
) {

    if (!elemento) {
        return;
    }


    if (valor > 0) {

        elemento.style.color =
            "#15803d";

        return;

    }


    if (valor < 0) {

        elemento.style.color =
            "#b91c1c";

        return;

    }


    elemento.style.color =
        "var(--text-light)";

}


/* =========================================================
   COR DO RESULTADO LÍQUIDO
   ========================================================= */

function atualizarClasseResultado(
    resultado
) {

    const elementos = [

        document.getElementById(
            "desempenho-resultado"
        ),

        document.getElementById(
            "resumo-resultado"
        )

    ];


    elementos.forEach(
        elemento => {

            if (!elemento) {
                return;
            }


            elemento.style.color = "";


            if (resultado > 0) {

                elemento.style.color =
                    "#15803d";

            } else if (resultado < 0) {

                elemento.style.color =
                    "#b91c1c";

            }

        }
    );

}


/* =========================================================
   GRÁFICO DE DESEMPENHO
   ========================================================= */

function criarGraficoDesempenho(grafico) {

    const canvas =
        document.getElementById(
            "desempenhoChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    if (desempenhoChart) {

        desempenhoChart.destroy();

    }


    const labels =
        grafico.labels || [];


    const receitas =
        grafico.receitas ||
        grafico.faturamento ||
        [];


    const despesas =
        grafico.despesas || [];


    let resultados =
        grafico.resultado ||
        grafico.resultados ||
        [];


    if (
        !resultados.length &&
        receitas.length
    ) {

        resultados =
            receitas.map(
                (valor, indice) => {

                    return (
                        Number(valor || 0) -
                        Number(
                            despesas[indice] || 0
                        )
                    );

                }
            );

    }


    desempenhoChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Receitas",

                            data:
                                receitas,

                            tension:
                                0.25

                        },

                        {

                            label:
                                "Despesas",

                            data:
                                despesas,

                            tension:
                                0.25

                        },

                        {

                            label:
                                "Resultado",

                            data:
                                resultados,

                            tension:
                                0.25

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        intersect:
                            false,

                        mode:
                            "index"

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    function(valor) {

                                        return formatarMoeda(
                                            valor
                                        );

                                    }

                            }

                        }

                    },


                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(contexto) {

                                        return (
                                            contexto.dataset.label +
                                            ": " +
                                            formatarMoeda(
                                                contexto.raw
                                            )
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   CARREGANDO DESEMPENHO
   ========================================================= */

function mostrarCarregandoDesempenho() {

    const ids = [

        "desempenho-faturamento",
        "desempenho-resultado",
        "desempenho-pedidos",
        "desempenho-ticket-medio",
        "desempenho-recebido",
        "desempenho-pendente",
        "desempenho-despesas",
        "desempenho-pedidos-entregues",
        "desempenho-orcamentos",
        "desempenho-orcamentos-aprovados",
        "desempenho-taxa-aprovacao"

    ];


    ids.forEach(id => {

        definirTexto(
            id,
            "..."
        );

    });

}


/* =========================================================
   ERRO NO DESEMPENHO
   ========================================================= */

function mostrarErroDesempenho() {

    const ids = [

        "desempenho-faturamento",
        "desempenho-resultado",
        "desempenho-pedidos",
        "desempenho-ticket-medio",
        "desempenho-recebido",
        "desempenho-pendente",
        "desempenho-despesas",
        "desempenho-pedidos-entregues",
        "desempenho-orcamentos",
        "desempenho-orcamentos-aprovados",
        "desempenho-taxa-aprovacao"

    ];


    ids.forEach(id => {

        definirTexto(
            id,
            "—"
        );

    });


    definirTexto(
        "comparativo-faturamento",
        "Não disponível"
    );

    definirTexto(
        "comparativo-resultado",
        "Não disponível"
    );

    definirTexto(
        "comparativo-pedidos",
        "Não disponível"
    );

    definirTexto(
        "comparativo-ticket",
        "Não disponível"
    );

}


/* =========================================================
   DESPESAS
   ========================================================= */

async function carregarDespesas() {

    try {

        const resposta =
            await fetch(
                "/api/despesas"
            );


        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar as despesas."
            );

        }


        const despesas =
            await resposta.json();


        atualizarTabelaDespesas(
            despesas
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar despesas:",
            erro
        );


        const tabela =
            document.getElementById(
                "lista-despesas"
            );


        if (tabela) {

            tabela.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        style="
                            text-align: center;
                            color: #c00;
                            padding: 30px;
                        "
                    >
                        Não foi possível carregar as despesas.
                    </td>
                </tr>
            `;

        }

    }

}


/* =========================================================
   TABELA DE DESPESAS
   ========================================================= */

function atualizarTabelaDespesas(
    despesas
) {

    const tabela =
        document.getElementById(
            "lista-despesas"
        );


    if (!tabela) {
        return;
    }


    if (
        !despesas ||
        despesas.length === 0
    ) {

        tabela.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    style="
                        text-align: center;
                        color: var(--text-light);
                        padding: 30px;
                    "
                >
                    Nenhuma despesa cadastrada.
                </td>
            </tr>
        `;

        return;

    }


    tabela.innerHTML =
        despesas
            .map(
                despesa => {

                    return `
                        <tr>

                            <td>
                                ${formatarData(
                                    despesa.data
                                )}
                            </td>

                            <td>
                                ${escaparHTML(
                                    despesa.descricao
                                )}
                            </td>

                            <td>
                                ${escaparHTML(
                                    despesa.categoria
                                )}
                            </td>

                            <td>
                                ${formatarMoeda(
                                    despesa.valor
                                )}
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="btn btn-danger btn-excluir-despesa"
                                    data-id="${despesa.id}"
                                >
                                    Excluir
                                </button>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");


    adicionarEventosExcluir();

}


/* =========================================================
   EVENTOS DE EXCLUSÃO
   ========================================================= */

function adicionarEventosExcluir() {

    const botoes =
        document.querySelectorAll(
            ".btn-excluir-despesa"
        );


    botoes.forEach(
        botao => {

            botao.addEventListener(
                "click",
                () => {

                    excluirDespesa(
                        botao.dataset.id
                    );

                }
            );

        }
    );

}


/* =========================================================
   EXCLUIR DESPESA
   ========================================================= */

async function excluirDespesa(id) {

    if (
        !confirm(
            "Tem certeza que deseja excluir esta despesa?"
        )
    ) {
        return;
    }


    try {

        const resposta =
            await fetch(
                `/api/despesas/${id}`,
                {
                    method: "DELETE"
                }
            );


        let dados = {};


        try {

            dados =
                await resposta.json();

        } catch {

            dados = {};

        }


        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                `Erro ${resposta.status} ao excluir a despesa.`
            );

        }


        alert(
            "Despesa excluída com sucesso."
        );


        await carregarFinanceiro();


        if (
            periodoDesempenhoAtual !==
            "personalizado"
        ) {

            await carregarDesempenho(
                periodoDesempenhoAtual
            );

        } else {

            const inicio =
                document.getElementById(
                    "data-inicial-desempenho"
                )?.value;

            const fim =
                document.getElementById(
                    "data-final-desempenho"
                )?.value;


            if (inicio && fim) {

                await carregarDesempenho(
                    "personalizado",
                    inicio,
                    fim
                );

            }

        }


    } catch (erro) {

        console.error(
            "Erro ao excluir despesa:",
            erro
        );


        alert(
            erro.message ||
            "Erro ao excluir despesa."
        );

    }

}


/* =========================================================
   ABRIR FORMULÁRIO
   ========================================================= */

function abrirFormularioDespesa() {

    const formulario =
        document.getElementById(
            "formulario-despesa"
        );


    if (!formulario) {
        return;
    }


    formulario.style.display =
        "block";


    formulario.scrollIntoView(
        {
            behavior: "smooth",
            block: "start"
        }
    );


    document
        .getElementById(
            "descricao-despesa"
        )
        ?.focus();

}


/* =========================================================
   FECHAR FORMULÁRIO
   ========================================================= */

function fecharFormularioDespesa() {

    const formulario =
        document.getElementById(
            "formulario-despesa"
        );


    const form =
        document.getElementById(
            "form-despesa"
        );


    if (formulario) {

        formulario.style.display =
            "none";

    }


    if (form) {

        form.reset();

    }


    definirDataDespesa();

}


/* =========================================================
   DATA DA DESPESA
   ========================================================= */

function definirDataDespesa() {

    const campo =
        document.getElementById(
            "data-despesa"
        );


    if (
        !campo ||
        campo.value
    ) {
        return;
    }


    campo.value =
        dataParaInput(
            new Date()
        );

}


/* =========================================================
   SALVAR DESPESA
   ========================================================= */

async function salvarDespesa(evento) {

    evento.preventDefault();

    evento.stopPropagation();


    const descricao =
        document
            .getElementById(
                "descricao-despesa"
            )
            ?.value
            .trim();


    const categoria =
        document
            .getElementById(
                "categoria-despesa"
            )
            ?.value;


    const valor =
        document
            .getElementById(
                "valor-despesa"
            )
            ?.value;


    const data =
        document
            .getElementById(
                "data-despesa"
            )
            ?.value;


    const observacao =
        document
            .getElementById(
                "observacao-despesa"
            )
            ?.value
            .trim();


    if (!descricao) {

        alert(
            "Informe a descrição da despesa."
        );

        return;

    }


    if (!categoria) {

        alert(
            "Selecione uma categoria."
        );

        return;

    }


    if (
        !valor ||
        Number(valor) <= 0
    ) {

        alert(
            "Informe um valor válido para a despesa."
        );

        return;

    }


    if (!data) {

        alert(
            "Informe a data da despesa."
        );

        return;

    }


    const dadosDespesa = {

        descricao: descricao,

        categoria: categoria,

        valor: Number(valor),

        data: data,

        observacao:
            observacao || null

    };


    try {

        const resposta =
            await fetch(
                "/api/despesas",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            dadosDespesa
                        )

                }
            );


        let dados = {};


        try {

            dados =
                await resposta.json();

        } catch {

            dados = {};

        }


        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                `Erro ${resposta.status} ao cadastrar despesa.`
            );

        }


        alert(
            "Despesa cadastrada com sucesso."
        );


        fecharFormularioDespesa();


        await carregarFinanceiro();


        if (
            periodoDesempenhoAtual !==
            "personalizado"
        ) {

            await carregarDesempenho(
                periodoDesempenhoAtual
            );

        } else {

            const inicio =
                document.getElementById(
                    "data-inicial-desempenho"
                )?.value;

            const fim =
                document.getElementById(
                    "data-final-desempenho"
                )?.value;


            if (inicio && fim) {

                await carregarDesempenho(
                    "personalizado",
                    inicio,
                    fim
                );

            }

        }


    } catch (erro) {

        console.error(
            "Erro ao salvar despesa:",
            erro
        );


        alert(
            erro.message ||
            "Erro ao cadastrar despesa."
        );

    }

}


/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function definirTexto(id, valor) {

    const elemento =
        document.getElementById(id);


    if (elemento) {

        elemento.textContent =
            valor;

    }

}


function dataParaInput(data) {

    const ano =
        data.getFullYear();


    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const dia =
        String(
            data.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${ano}-${mes}-${dia}`;

}


/* =========================================================
   FORMATAR MOEDA
   ========================================================= */

function formatarMoeda(valor) {

    const numero =
        Number(valor);


    if (
        Number.isNaN(numero)
    ) {

        return "R$ 0,00";

    }


    return numero.toLocaleString(
        "pt-BR",
        {

            style:
                "currency",

            currency:
                "BRL"

        }
    );

}


/* =========================================================
   FORMATAR PERCENTUAL
   ========================================================= */

function formatarPercentual(valor) {

    const numero =
        Number(valor || 0);


    if (
        Number.isNaN(numero)
    ) {

        return "0%";

    }


    return (
        numero
            .toFixed(1)
            .replace(".", ",") +
        "%"
    );

}


/* =========================================================
   FORMATAR DATA
   ========================================================= */

function formatarData(data) {

    if (!data) {
        return "—";
    }


    const valor =
        String(data)
            .substring(
                0,
                10
            );


    const partes =
        valor.split("-");


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


/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escaparHTML(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(valor)

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


/* =========================================================
   ERRO DO FINANCEIRO PRINCIPAL
   ========================================================= */

function mostrarErro() {

    const elementos = [

        "faturamento",

        "total-recebido",

        "total-pendente",

        "total-despesas",

        "saldo"

    ];


    elementos.forEach(
        id => {

            const elemento =
                document.getElementById(
                    id
                );


            if (elemento) {

                elemento.textContent =
                    "Erro";

            }

        }
    );

}