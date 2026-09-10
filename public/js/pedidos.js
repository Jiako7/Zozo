let todosOsPedidos = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarPedidos();

    document.getElementById("filtro-busca")
        ?.addEventListener("input", aplicarFiltros);

    document.getElementById("filtro-status")
        ?.addEventListener("change", aplicarFiltros);

    document.getElementById("filtro-periodo")
        ?.addEventListener("change", aplicarFiltros);
});


async function carregarPedidos() {
    const tabela = document.getElementById("lista-pedidos");

    try {
        tabela.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center;">
                    Carregando pedidos...
                </td>
            </tr>
        `;

        const resposta = await fetch("/api/pedidos");

        if (!resposta.ok) {
            throw new Error("Erro ao buscar pedidos.");
        }

        const pedidos = await resposta.json();

        console.log("Pedidos recebidos da API:", pedidos);

        todosOsPedidos = Array.isArray(pedidos) ? pedidos : [];

        aplicarFiltros();

    } catch (erro) {
        console.error("Erro ao carregar pedidos:", erro);

        tabela.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #c00;">
                    Não foi possível carregar os pedidos.
                </td>
            </tr>
        `;
    }
}


function aplicarFiltros() {
    const campoBusca = document.getElementById("filtro-busca");
    const campoStatus = document.getElementById("filtro-status");
    const campoPeriodo = document.getElementById("filtro-periodo");

    const busca = campoBusca
        ? campoBusca.value.trim().toLowerCase()
        : "";

    const status = campoStatus
        ? campoStatus.value
        : "";

    const periodo = campoPeriodo
        ? campoPeriodo.value
        : "";

    let pedidosFiltrados = todosOsPedidos.filter(pedido => {

        // BUSCA
        const correspondeBusca =
            !busca ||
            String(pedido.numero_pedido || "")
                .toLowerCase()
                .includes(busca) ||
            String(pedido.cliente_nome || "")
                .toLowerCase()
                .includes(busca) ||
            String(pedido.servico || "")
                .toLowerCase()
                .includes(busca);

        // STATUS
        const correspondeStatus =
            !status ||
            pedido.status === status;

        // PERÍODO
        const correspondePeriodo =
            !periodo ||
            verificarPeriodo(pedido.data_entrega, periodo);

        return (
            correspondeBusca &&
            correspondeStatus &&
            correspondePeriodo
        );
    });

    renderizarPedidos(pedidosFiltrados);
}


function verificarPeriodo(data, periodo) {
    if (!data) return false;

    const dataPedido = criarDataLocal(data);

    if (!dataPedido) return false;

    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    if (periodo === "hoje") {
        return dataPedido.getTime() === hoje.getTime();
    }

    if (periodo === "semana") {
        const diaSemana = hoje.getDay();

        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(
            hoje.getDate() - diaSemana
        );

        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(
            inicioSemana.getDate() + 6
        );

        return (
            dataPedido >= inicioSemana &&
            dataPedido <= fimSemana
        );
    }

    if (periodo === "mes") {
        return (
            dataPedido.getMonth() === hoje.getMonth() &&
            dataPedido.getFullYear() === hoje.getFullYear()
        );
    }

    return true;
}


function criarDataLocal(data) {
    if (!data) return null;

    const partes = String(data).split("-");

    if (partes.length !== 3) {
        return null;
    }

    const ano = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);

    const resultado = new Date(
        ano,
        mes,
        dia
    );

    resultado.setHours(0, 0, 0, 0);

    return resultado;
}


function renderizarPedidos(pedidos) {
    const tabela = document.getElementById("lista-pedidos");

    if (!tabela) {
        console.error("Elemento #lista-pedidos não encontrado.");
        return;
    }

    if (pedidos.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7"
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

    tabela.innerHTML = pedidos.map(pedido => {

        const atrasado = verificarAtraso(pedido);

        return `
            <tr class="${atrasado ? "row-overdue" : ""}">

                <td>
                    <strong>
                        #${escaparHTML(pedido.numero_pedido)}
                    </strong>
                </td>

                <td>
                    ${escaparHTML(pedido.cliente_nome || "—")}
                </td>

                <td>
                    ${escaparHTML(pedido.servico || "—")}
                </td>

                <td>
                    ${formatarData(pedido.data_entrega)}
                </td>

                <td>
                    ${formatarValor(pedido.valor)}
                </td>

                <td>
                    ${criarStatus(pedido.status)}
                </td>

                <td>
                    <a
                        href="pedido.html?id=${pedido.id}"
                        class="btn btn-secondary"
                        style="white-space: nowrap;"
                    >
                        Abrir
                    </a>
                </td>

            </tr>
        `;

    }).join("");
}


function verificarAtraso(pedido) {
    if (!pedido.data_entrega) {
        return false;
    }

    if (pedido.status === "Entregue") {
        return false;
    }

    const entrega = criarDataLocal(pedido.data_entrega);

    if (!entrega) {
        return false;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return entrega < hoje;
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


function formatarData(data) {
    if (!data) return "—";

    const partes = String(data).split("-");

    if (partes.length !== 3) {
        return escaparHTML(data);
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function formatarValor(valor) {
    const numero = Number(valor);

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