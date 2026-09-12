let statusChart = null;
let financeChart = null;


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    carregarDashboard();
});


/* =========================================================
   CARREGAR DASHBOARD
   ========================================================= */

async function carregarDashboard() {
    try {
        definirEstadoCarregando();

        const resposta = await fetch("/api/dashboard");

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar o dashboard.");
        }

        const dados = await resposta.json();

        atualizarCards(dados);

        atualizarResumoPrazos(
            dados.proximos ?? 0
        );

        atualizarTabela(
            dados.pedidos ?? []
        );

        criarGraficoStatus(
            dados.status ?? {}
        );

        criarGraficoFinanceiro(
            dados.financeiro ?? {}
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar dashboard:",
            erro
        );

        mostrarErroDashboard();
    }
}


/* =========================================================
   CARDS
   ========================================================= */

function atualizarCards(dados) {
    definirTexto(
        "total-aguardando",
        dados.status?.aguardando ?? 0
    );

    definirTexto(
        "total-andamento",
        dados.status?.andamento ?? 0
    );

    definirTexto(
        "total-prontos",
        dados.status?.pronto ?? 0
    );

    definirTexto(
        "total-entregues",
        dados.status?.entregue ?? 0
    );

    definirTexto(
        "total-proximos",
        dados.proximos ?? 0
    );

    definirTexto(
        "faturamento",
        formatarMoeda(
            dados.financeiro?.faturamento ?? 0
        )
    );

    definirTexto(
        "total-recebido",
        formatarMoeda(
            dados.financeiro?.recebido ?? 0
        )
    );

    definirTexto(
        "total-pendente",
        formatarMoeda(
            dados.financeiro?.pendente ?? 0
        )
    );
}


/* =========================================================
   RESUMO DE PRAZOS
   ========================================================= */

function atualizarResumoPrazos(total) {
    const resumo = document.getElementById(
        "resumo-prazos"
    );

    const texto = resumo?.querySelector(
        ".attention-text"
    );

    if (!resumo || !texto) {
        return;
    }

    const quantidade = Number(total) || 0;

    if (quantidade === 0) {
        texto.textContent =
            "Nenhum pedido precisa de atenção no momento.";

        resumo.style.background = "#eefbf3";
        resumo.style.borderColor = "#c8ead5";

        return;
    }

    if (quantidade === 1) {
        texto.textContent =
            "pedido está próximo do prazo de entrega.";
    } else {
        texto.textContent =
            "pedidos estão próximos do prazo de entrega.";
    }

    resumo.style.background = "#fff8e7";
    resumo.style.borderColor = "#f4dfaa";
}


/* =========================================================
   TABELA — PEDIDOS PRÓXIMOS
   ========================================================= */

function atualizarTabela(pedidos) {
    const tabela = document.getElementById(
        "proximos-pedidos"
    );

    if (!tabela) {
        return;
    }

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    style="
                        text-align: center;
                        color: var(--text-light);
                        padding: 32px;
                    "
                >
                    Nenhum pedido próximo do prazo.
                </td>
            </tr>
        `;

        return;
    }


    tabela.innerHTML = pedidos.map(pedido => {

        const numero =
            escaparHTML(
                pedido.numero ?? ""
            );

        const cliente =
            escaparHTML(
                pedido.cliente || "—"
            );

        const servico =
            escaparHTML(
                pedido.servico || "—"
            );

        const entrega =
            formatarData(
                pedido.entrega
            );

        const status =
            criarStatus(
                pedido.status
            );


        return `
            <tr>

                <td>
                    <strong>
                        #${numero}
                    </strong>
                </td>

                <td>
                    ${cliente}
                </td>

                <td>
                    ${servico}
                </td>

                <td>
                    ${entrega}
                </td>

                <td>
                    ${status}
                </td>

            </tr>
        `;

    }).join("");
}


/* =========================================================
   GRÁFICO DE STATUS
   ========================================================= */

function criarGraficoStatus(status) {
    const canvas = document.getElementById(
        "statusChart"
    );

    if (!canvas || typeof Chart === "undefined") {
        return;
    }


    if (statusChart) {
        statusChart.destroy();
    }


    statusChart = new Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                labels: [
                    "Aguardando",
                    "Em andamento",
                    "Pronto",
                    "Entregue"
                ],

                datasets: [
                    {
                        data: [
                            status?.aguardando ?? 0,
                            status?.andamento ?? 0,
                            status?.pronto ?? 0,
                            status?.entregue ?? 0
                        ],

                        borderWidth: 2
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                cutout: "65%",

                plugins: {
                    legend: {
                        position: "bottom",

                        labels: {
                            usePointStyle: true,
                            padding: 18
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label: function(contexto) {
                                return `${contexto.label}: ${contexto.raw}`;
                            }
                        }
                    }
                }
            }
        }
    );
}


/* =========================================================
   GRÁFICO FINANCEIRO
   ========================================================= */

function criarGraficoFinanceiro(financeiro) {
    const canvas = document.getElementById(
        "financeChart"
    );

    if (!canvas || typeof Chart === "undefined") {
        return;
    }


    if (financeChart) {
        financeChart.destroy();
    }


    financeChart = new Chart(
        canvas,
        {
            type: "bar",

            data: {
                labels: [
                    "Faturamento",
                    "Recebido",
                    "A receber"
                ],

                datasets: [
                    {
                        label: "Valor",

                        data: [
                            financeiro?.faturamento ?? 0,
                            financeiro?.recebido ?? 0,
                            financeiro?.pendente ?? 0
                        ],

                        borderRadius: 6
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
   STATUS
   ========================================================= */

function criarStatus(status) {
    let classe = "";

    switch (status) {

        case "Aguardando":
            classe = "status-aguardando";
            break;

        case "Em andamento":
            classe = "status-andamento";
            break;

        case "Pronto":
            classe = "status-pronto";
            break;

        case "Entregue":
            classe = "status-entregue";
            break;

        default:
            classe = "";
    }


    return `
        <span class="status ${classe}">
            ${escaparHTML(status || "—")}
        </span>
    `;
}


/* =========================================================
   ESTADO DE CARREGAMENTO
   ========================================================= */

function definirEstadoCarregando() {
    const tabela = document.getElementById(
        "proximos-pedidos"
    );

    if (!tabela) {
        return;
    }

    tabela.innerHTML = `
        <tr>
            <td
                colspan="5"
                style="
                    text-align: center;
                    color: var(--text-light);
                    padding: 32px;
                "
            >
                Carregando informações...
            </td>
        </tr>
    `;
}


/* =========================================================
   ERRO
   ========================================================= */

function mostrarErroDashboard() {
    const tabela = document.getElementById(
        "proximos-pedidos"
    );

    if (tabela) {
        tabela.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    style="
                        text-align: center;
                        color: #b42318;
                        padding: 32px;
                    "
                >
                    Não foi possível carregar os dados do dashboard.
                </td>
            </tr>
        `;
    }


    const resumo = document.getElementById(
        "resumo-prazos"
    );

    if (resumo) {
        resumo.innerHTML = `
            <span class="attention-text">
                Não foi possível carregar as informações.
            </span>
        `;
    }
}


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}


function formatarMoeda(valor) {
    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return "R$ 0,00";
    }

    return numero.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function formatarData(data) {
    if (!data) {
        return "—";
    }


    const partes =
        String(data)
            .substring(0, 10)
            .split("-");


    if (partes.length !== 3) {
        return escaparHTML(data);
    }


    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


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