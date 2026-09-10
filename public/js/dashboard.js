let statusChart = null;
let financeChart = null;

document.addEventListener("DOMContentLoaded", () => {
    carregarDashboard();
});


async function carregarDashboard() {
    try {
        const resposta = await fetch("/api/dashboard");

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar o dashboard.");
        }

        const dados = await resposta.json();

        console.log("Dados do dashboard:", dados);

        atualizarCards(dados);
        atualizarTabela(dados.pedidos);
        criarGraficoStatus(dados.status);
        criarGraficoFinanceiro(dados.financeiro);

    } catch (erro) {
        console.error("Erro ao carregar dashboard:", erro);

        mostrarErroDashboard();
    }
}


function atualizarCards(dados) {
    document.getElementById("total-aguardando").textContent =
        dados.status?.aguardando ?? 0;

    document.getElementById("total-andamento").textContent =
        dados.status?.andamento ?? 0;

    document.getElementById("total-prontos").textContent =
        dados.status?.pronto ?? 0;

    document.getElementById("total-entregues").textContent =
        dados.status?.entregue ?? 0;

    document.getElementById("total-proximos").textContent =
        dados.proximos ?? 0;

    document.getElementById("faturamento").textContent =
        formatarMoeda(dados.financeiro?.faturamento ?? 0);

    document.getElementById("total-recebido").textContent =
        formatarMoeda(dados.financeiro?.recebido ?? 0);

    document.getElementById("total-pendente").textContent =
        formatarMoeda(dados.financeiro?.pendente ?? 0);
}


function atualizarTabela(pedidos) {
    const tabela = document.getElementById("proximos-pedidos");

    if (!tabela) {
        console.error("Elemento #proximos-pedidos não encontrado.");
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="5"
                    style="
                        text-align: center;
                        color: var(--text-light);
                        padding: 30px;
                    ">
                    Nenhum pedido encontrado.
                </td>
            </tr>
        `;

        return;
    }

    tabela.innerHTML = pedidos.map(pedido => `
        <tr>

            <td>
                <strong>
                    #${escaparHTML(pedido.numero)}
                </strong>
            </td>

            <td>
                ${escaparHTML(pedido.cliente || "—")}
            </td>

            <td>
                ${escaparHTML(pedido.servico || "—")}
            </td>

            <td>
                ${formatarData(pedido.entrega)}
            </td>

            <td>
                ${criarStatus(pedido.status)}
            </td>

        </tr>
    `).join("");
}


function criarGraficoStatus(status) {
    const canvas = document.getElementById("statusChart");

    if (!canvas) {
        return;
    }

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: [
                "Aguardando",
                "Em andamento",
                "Pronto",
                "Entregue"
            ],

            datasets: [{
                data: [
                    status?.aguardando ?? 0,
                    status?.andamento ?? 0,
                    status?.pronto ?? 0,
                    status?.entregue ?? 0
                ]
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}


function criarGraficoFinanceiro(financeiro) {
    const canvas = document.getElementById("financeChart");

    if (!canvas) {
        return;
    }

    if (financeChart) {
        financeChart.destroy();
    }

    financeChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels: [
                "Faturamento",
                "Recebido",
                "Pendente"
            ],

            datasets: [{
                label: "Valor",
                data: [
                    financeiro?.faturamento ?? 0,
                    financeiro?.recebido ?? 0,
                    financeiro?.pendente ?? 0
                ]
            }]
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
                            return formatarMoeda(contexto.raw);
                        }
                    }
                }
            }
        }
    });
}


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
    }

    return `
        <span class="status ${classe}">
            ${escaparHTML(status || "—")}
        </span>
    `;
}


function formatarMoeda(valor) {
    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return "R$ 0,00";
    }

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


function formatarData(data) {
    if (!data) {
        return "—";
    }

    const partes = String(data).split("-");

    if (partes.length !== 3) {
        return escaparHTML(data);
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
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


function mostrarErroDashboard() {
    const tabela = document.getElementById("proximos-pedidos");

    if (tabela) {
        tabela.innerHTML = `
            <tr>
                <td colspan="5"
                    style="
                        text-align: center;
                        color: #c00;
                        padding: 30px;
                    ">
                    Não foi possível carregar os dados.
                </td>
            </tr>
        `;
    }
}