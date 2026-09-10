let orcamentos = [];
let clientes = [];

let orcamentoEmEdicao = null;


// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    configurarEventos();

    definirDataAtual();

    adicionarEventosItem();

    calcularTotalOrcamento();

    await carregarClientes();

    await carregarOrcamentos();


    // Se vier do dashboard:
    // orcamentos.html?novo=1

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    if (
        parametros.get("novo") === "1"
    ) {

        abrirNovoOrcamento();
    }
});


// ==========================================
// EVENTOS
// ==========================================

function configurarEventos() {

    const btnNovo =
        document.getElementById(
            "btn-novo-orcamento"
        );

    const btnCancelar =
        document.getElementById(
            "btn-cancelar-orcamento"
        );

    const btnAdicionar =
        document.getElementById(
            "btn-adicionar-item"
        );

    const formulario =
        document.getElementById(
            "form-orcamento"
        );

    const busca =
        document.getElementById(
            "busca-orcamento"
        );

    const filtroStatus =
        document.getElementById(
            "filtro-status-orcamento"
        );

    const btnPdf =
        document.getElementById(
            "btn-pdf-orcamento"
        );

    const btnRecusar =
        document.getElementById(
            "btn-recusar-orcamento"
        );

    const btnAprovar =
        document.getElementById(
            "btn-aprovar-orcamento"
        );


    if (btnNovo) {

        btnNovo.addEventListener(
            "click",
            abrirNovoOrcamento
        );
    }


    if (btnCancelar) {

        btnCancelar.addEventListener(
            "click",
            fecharFormulario
        );
    }


    if (btnAdicionar) {

        btnAdicionar.addEventListener(
            "click",
            adicionarItem
        );
    }


    if (formulario) {

        formulario.addEventListener(
            "submit",
            salvarOrcamento
        );
    }


    if (busca) {

        busca.addEventListener(
            "input",
            filtrarOrcamentos
        );
    }


    if (filtroStatus) {

        filtroStatus.addEventListener(
            "change",
            filtrarOrcamentos
        );
    }


    if (btnPdf) {

        btnPdf.addEventListener(
            "click",
            gerarPdfOrcamento
        );
    }


    if (btnRecusar) {

        btnRecusar.addEventListener(
            "click",
            recusarOrcamento
        );
    }


    if (btnAprovar) {

        btnAprovar.addEventListener(
            "click",
            aprovarETransformarEmPedido
        );
    }
}


// ==========================================
// CLIENTES
// ==========================================

async function carregarClientes() {

    const select =
        document.getElementById(
            "cliente-orcamento"
        );

    if (!select) {
        return;
    }


    try {

        const resposta =
            await fetch(
                "/api/clientes"
            );


        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar os clientes."
            );
        }


        const dados =
            await resposta.json();


        clientes =
            Array.isArray(dados)
                ? dados
                : [];


        preencherSelectClientes();


    } catch (erro) {

        console.error(
            "Erro ao carregar clientes:",
            erro
        );


        select.innerHTML = `
            <option value="">
                Erro ao carregar clientes
            </option>
        `;
    }
}


function preencherSelectClientes() {

    const select =
        document.getElementById(
            "cliente-orcamento"
        );

    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Selecione um cliente
        </option>
    `;


    clientes.forEach(
        cliente => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                cliente.id;


            option.textContent =
                cliente.nome;


            select.appendChild(
                option
            );
        }
    );
}


// ==========================================
// ABRIR NOVO ORÇAMENTO
// ==========================================

function abrirNovoOrcamento() {

    orcamentoEmEdicao = null;


    const form =
        document.getElementById(
            "form-orcamento"
        );


    if (form) {

        form.reset();
    }


    document.getElementById(
        "orcamento-id"
    ).value = "";


    document.getElementById(
        "numero-orcamento"
    ).value = "Automático";


    const titulo =
        document.getElementById(
            "titulo-formulario-orcamento"
        );


    if (titulo) {

        titulo.textContent =
            "Novo orçamento";
    }


    const subtitulo =
        document.getElementById(
            "subtitulo-formulario-orcamento"
        );


    if (subtitulo) {

        subtitulo.textContent =
            "Preencha os dados do orçamento";
    }


    limparItens();

    definirDataAtual();

    configurarModoNovo();

    mostrarFormulario();


    const cliente =
        document.getElementById(
            "cliente-orcamento"
        );


    if (cliente) {

        cliente.focus();
    }
}


// ==========================================
// MOSTRAR FORMULÁRIO
// ==========================================

function mostrarFormulario() {

    const formulario =
        document.getElementById(
            "formulario-orcamento"
        );


    if (!formulario) {
        return;
    }


    formulario.style.display =
        "block";


    formulario.scrollIntoView({
        behavior:
            "smooth",

        block:
            "start"
    });
}


// Compatibilidade com código antigo

function abrirFormulario() {

    abrirNovoOrcamento();
}


// ==========================================
// FECHAR FORMULÁRIO
// ==========================================

function fecharFormulario() {

    const formulario =
        document.getElementById(
            "formulario-orcamento"
        );


    if (formulario) {

        formulario.style.display =
            "none";
    }


    orcamentoEmEdicao = null;


    configurarModoNovo();
}


// ==========================================
// MODO NOVO
// ==========================================

function configurarModoNovo() {

    const statusArea =
        document.getElementById(
            "status-orcamento-area"
        );

    const btnPdf =
        document.getElementById(
            "btn-pdf-orcamento"
        );

    const btnRecusar =
        document.getElementById(
            "btn-recusar-orcamento"
        );

    const btnAprovar =
        document.getElementById(
            "btn-aprovar-orcamento"
        );

    const pedidoArea =
        document.getElementById(
            "pedido-gerado-area"
        );

    const btnSalvar =
        document.getElementById(
            "btn-salvar-orcamento"
        );

    const btnAdicionar =
        document.getElementById(
            "btn-adicionar-item"
        );


    if (statusArea) {

        statusArea.style.display =
            "none";
    }


    if (btnPdf) {

        btnPdf.style.display =
            "none";
    }


    if (btnRecusar) {

        btnRecusar.style.display =
            "none";
    }


    if (btnAprovar) {

        btnAprovar.style.display =
            "none";
    }


    if (pedidoArea) {

        pedidoArea.style.display =
            "none";
    }


    if (btnSalvar) {

        btnSalvar.style.display =
            "";

        btnSalvar.disabled =
            false;

        btnSalvar.textContent =
            "Salvar orçamento";
    }


    if (btnAdicionar) {

        btnAdicionar.disabled =
            false;
    }


    definirFormularioDesabilitado(
        false
    );
}


// ==========================================
// MODO EDIÇÃO
// ==========================================

function configurarModoEdicao(
    orcamento
) {

    const statusArea =
        document.getElementById(
            "status-orcamento-area"
        );

    const statusAtual =
        document.getElementById(
            "status-orcamento-atual"
        );

    const btnPdf =
        document.getElementById(
            "btn-pdf-orcamento"
        );

    const btnRecusar =
        document.getElementById(
            "btn-recusar-orcamento"
        );

    const btnAprovar =
        document.getElementById(
            "btn-aprovar-orcamento"
        );

    const btnSalvar =
        document.getElementById(
            "btn-salvar-orcamento"
        );

    const pedidoArea =
        document.getElementById(
            "pedido-gerado-area"
        );

    const pedidoTexto =
        document.getElementById(
            "pedido-gerado-texto"
        );

    const linkPedido =
        document.getElementById(
            "link-pedido-gerado"
        );


    if (statusArea) {

        statusArea.style.display =
            "block";
    }


    if (statusAtual) {

        statusAtual.textContent =
            orcamento.status ||
            "Pendente";

        statusAtual.className =
            criarClasseStatus(
                orcamento.status
            );
    }


    if (btnPdf) {

        btnPdf.style.display =
            "";
    }


    const jaVirouPedido =
        Boolean(
            orcamento.pedido_id
        );


    // ======================================
    // JÁ VIROU PEDIDO
    // ======================================

    if (jaVirouPedido) {

        if (pedidoArea) {

            pedidoArea.style.display =
                "block";
        }


        if (pedidoTexto) {

            pedidoTexto.textContent =
                orcamento.numero_pedido
                    ? `Pedido #${orcamento.numero_pedido}`
                    : "Pedido já criado.";
        }


        if (linkPedido) {

            linkPedido.href =
                `pedido.html?id=${orcamento.pedido_id}`;
        }


        if (btnAprovar) {

            btnAprovar.style.display =
                "none";
        }


        if (btnRecusar) {

            btnRecusar.style.display =
                "none";
        }


        if (btnSalvar) {

            btnSalvar.style.display =
                "none";
        }


        definirFormularioDesabilitado(
            true
        );


        return;
    }


    // ======================================
    // AINDA PODE SER EDITADO
    // ======================================

    if (pedidoArea) {

        pedidoArea.style.display =
            "none";
    }


    definirFormularioDesabilitado(
        false
    );


    if (btnSalvar) {

        btnSalvar.style.display =
            "";

        btnSalvar.disabled =
            false;

        btnSalvar.textContent =
            "Salvar alterações";
    }


    // PENDENTE

    if (
        orcamento.status ===
        "Pendente"
    ) {

        if (btnAprovar) {

            btnAprovar.style.display =
                "";
        }


        if (btnRecusar) {

            btnRecusar.style.display =
                "";
        }

    } else {

        if (btnAprovar) {

            btnAprovar.style.display =
                orcamento.status ===
                "Recusado"
                    ? ""
                    : "none";
        }


        if (btnRecusar) {

            btnRecusar.style.display =
                orcamento.status ===
                "Aprovado"
                    ? ""
                    : "none";
        }
    }
}


// ==========================================
// DESABILITAR CAMPOS
// ==========================================

function definirFormularioDesabilitado(
    desabilitado
) {

    const seletores = [

        "#cliente-orcamento",

        "#data-orcamento",

        "#validade-orcamento",

        "#observacoes-orcamento",

        "#btn-adicionar-item",

        ".quantidade-item",

        ".descricao-item",

        ".valor-unitario-item",

        ".btn-remover-item"
    ];


    seletores.forEach(
        seletor => {

            document
                .querySelectorAll(
                    seletor
                )
                .forEach(
                    elemento => {

                        elemento.disabled =
                            desabilitado;
                    }
                );
        }
    );
}


// ==========================================
// DATA ATUAL
// ==========================================

function definirDataAtual() {

    const campo =
        document.getElementById(
            "data-orcamento"
        );


    if (!campo) {
        return;
    }


    if (!campo.value) {

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
}


// ==========================================
// CRIAR LINHA DE ITEM
// ==========================================

function criarLinhaItem(
    item = null
) {

    const linha =
        document.createElement(
            "tr"
        );


    linha.className =
        "item-orcamento";


    linha.innerHTML = `
        <td>

            <input
                type="text"
                class="form-control quantidade-item"
                placeholder="Ex.: 2 P"
                value="${escaparAtributo(
                    item?.quantidade || ""
                )}"
                required
            >

        </td>

        <td>

            <input
                type="text"
                class="form-control descricao-item"
                placeholder="Descrição do serviço ou peça"
                value="${escaparAtributo(
                    item?.descricao || ""
                )}"
                required
            >

        </td>

        <td>

            <input
                type="number"
                class="form-control valor-unitario-item"
                placeholder="0,00"
                min="0"
                step="0.01"
                value="${
                    item?.valor_unitario !==
                    undefined
                        ? Number(
                            item.valor_unitario
                        )
                        : ""
                }"
                required
            >

        </td>

        <td>

            <input
                type="text"
                class="form-control total-item"
                value="${formatarMoeda(
                    item?.total || 0
                )}"
                readonly
            >

        </td>

        <td>

            <button
                type="button"
                class="btn btn-secondary btn-remover-item"
                title="Remover item"
            >
                ×
            </button>

        </td>
    `;


    adicionarEventosItem(
        linha
    );


    return linha;
}


// ==========================================
// ADICIONAR ITEM
// ==========================================

function adicionarItem() {

    const lista =
        document.getElementById(
            "lista-itens-orcamento"
        );


    if (!lista) {
        return;
    }


    const linha =
        criarLinhaItem();


    lista.appendChild(
        linha
    );


    const quantidade =
        linha.querySelector(
            ".quantidade-item"
        );


    if (quantidade) {

        quantidade.focus();
    }
}


// ==========================================
// REMOVER ITEM
// ==========================================

function removerItem(event) {

    const linha =
        event.currentTarget.closest(
            "tr"
        );

    const lista =
        document.getElementById(
            "lista-itens-orcamento"
        );


    if (!linha || !lista) {
        return;
    }


    const linhas =
        lista.querySelectorAll(
            "tr"
        );


    if (
        linhas.length <= 1
    ) {

        alert(
            "O orçamento precisa ter pelo menos um item."
        );

        return;
    }


    linha.remove();


    calcularTotalOrcamento();
}


// ==========================================
// EVENTOS DOS ITENS
// ==========================================

function adicionarEventosItem(
    linhaEspecifica = null
) {

    const lista =
        document.getElementById(
            "lista-itens-orcamento"
        );


    if (!lista) {
        return;
    }


    const linhas =
        linhaEspecifica
            ? [linhaEspecifica]
            : lista.querySelectorAll(
                "tr"
            );


    linhas.forEach(
        linha => {

            const quantidade =
                linha.querySelector(
                    ".quantidade-item"
                );

            const valor =
                linha.querySelector(
                    ".valor-unitario-item"
                );

            const remover =
                linha.querySelector(
                    ".btn-remover-item"
                );


            if (quantidade) {

                quantidade.addEventListener(
                    "input",
                    () => {

                        calcularTotalItem(
                            linha
                        );

                        calcularTotalOrcamento();
                    }
                );
            }


            if (valor) {

                valor.addEventListener(
                    "input",
                    () => {

                        calcularTotalItem(
                            linha
                        );

                        calcularTotalOrcamento();
                    }
                );
            }


            if (remover) {

                remover.addEventListener(
                    "click",
                    removerItem
                );
            }


            calcularTotalItem(
                linha
            );
        }
    );
}


// ==========================================
// CALCULAR TOTAL DO ITEM
// ==========================================

function calcularTotalItem(
    linha
) {

    if (!linha) {
        return;
    }


    const campoQuantidade =
        linha.querySelector(
            ".quantidade-item"
        );

    const campoValor =
        linha.querySelector(
            ".valor-unitario-item"
        );

    const campoTotal =
        linha.querySelector(
            ".total-item"
        );


    if (
        !campoQuantidade ||
        !campoValor ||
        !campoTotal
    ) {
        return;
    }


    const quantidade =
        extrairQuantidade(
            campoQuantidade.value
        );


    const valorUnitario =
        Number(
            campoValor.value
        );


    if (
        Number.isNaN(
            valorUnitario
        ) ||
        valorUnitario < 0
    ) {

        campoTotal.value =
            "R$ 0,00";

        return;
    }


    const total =
        quantidade *
        valorUnitario;


    campoTotal.value =
        formatarMoeda(
            total
        );
}


// ==========================================
// EXTRAIR QUANTIDADE
// ==========================================

function extrairQuantidade(
    valor
) {

    if (!valor) {
        return 0;
    }


    const texto =
        String(
            valor
        )
            .replace(
                ",",
                "."
            )
            .trim();


    const correspondencia =
        texto.match(
            /\d+(?:\.\d+)?/
        );


    if (!correspondencia) {
        return 0;
    }


    const quantidade =
        Number(
            correspondencia[0]
        );


    return Number.isNaN(
        quantidade
    )
        ? 0
        : quantidade;
}


// ==========================================
// CALCULAR TOTAL DO ORÇAMENTO
// ==========================================

function calcularTotalOrcamento() {

    const lista =
        document.getElementById(
            "lista-itens-orcamento"
        );

    const campoTotal =
        document.getElementById(
            "valor-total-orcamento"
        );


    if (!lista || !campoTotal) {
        return 0;
    }


    const linhas =
        lista.querySelectorAll(
            "tr"
        );


    let totalGeral =
        0;


    linhas.forEach(
        linha => {

            const quantidade =
                linha.querySelector(
                    ".quantidade-item"
                );

            const valor =
                linha.querySelector(
                    ".valor-unitario-item"
                );


            if (
                !quantidade ||
                !valor
            ) {
                return;
            }


            const quantidadeNumerica =
                extrairQuantidade(
                    quantidade.value
                );


            const valorUnitario =
                Number(
                    valor.value
                );


            if (
                !Number.isNaN(
                    valorUnitario
                ) &&
                valorUnitario >= 0
            ) {

                totalGeral +=
                    quantidadeNumerica *
                    valorUnitario;
            }
        }
    );


    campoTotal.textContent =
        formatarMoeda(
            totalGeral
        );


    return totalGeral;
}


// ==========================================
// OBTER ITENS DO FORMULÁRIO
// ==========================================

function obterItensFormulario() {

    const lista =
        document.getElementById(
            "lista-itens-orcamento"
        );


    if (!lista) {
        return [];
    }


    const linhas =
        lista.querySelectorAll(
            "tr"
        );


    const itens =
        [];


    for (
        const linha
        of linhas
    ) {

        const campoQuantidade =
            linha.querySelector(
                ".quantidade-item"
            );

        const campoDescricao =
            linha.querySelector(
                ".descricao-item"
            );

        const campoValor =
            linha.querySelector(
                ".valor-unitario-item"
            );


        const quantidade =
            campoQuantidade
                ? campoQuantidade.value.trim()
                : "";


        const descricao =
            campoDescricao
                ? campoDescricao.value.trim()
                : "";


        const valorTexto =
            campoValor
                ? campoValor.value
                : "";


        // Ignora linha totalmente vazia

        if (
            !quantidade &&
            !descricao &&
            !valorTexto
        ) {

            continue;
        }


        if (!quantidade) {

            throw new Error(
                "Informe a quantidade de todos os itens."
            );
        }


        const quantidadeNumerica =
            extrairQuantidade(
                quantidade
            );


        if (
            quantidadeNumerica <= 0
        ) {

            throw new Error(
                `A quantidade "${quantidade}" não é válida.`
            );
        }


        if (!descricao) {

            throw new Error(
                "Informe a descrição de todos os itens."
            );
        }


        const valorUnitario =
            Number(
                valorTexto
            );


        if (
            Number.isNaN(
                valorUnitario
            ) ||
            valorUnitario < 0
        ) {

            throw new Error(
                "Informe um valor unitário válido para todos os itens."
            );
        }


        itens.push({

            quantidade:
                quantidade,

            descricao:
                descricao,

            valor_unitario:
                valorUnitario,

            total:
                quantidadeNumerica *
                valorUnitario
        });
    }


    if (
        itens.length === 0
    ) {

        throw new Error(
            "Adicione pelo menos um item ao orçamento."
        );
    }


    return itens;
}


// ==========================================
// OBTER DADOS DO FORMULÁRIO
// ==========================================

function obterDadosFormulario() {

    const cliente =
        document.getElementById(
            "cliente-orcamento"
        ).value;


    const data =
        document.getElementById(
            "data-orcamento"
        ).value;


    const validade =
        document.getElementById(
            "validade-orcamento"
        ).value.trim();


    const observacoes =
        document.getElementById(
            "observacoes-orcamento"
        ).value.trim();


    if (!cliente) {

        throw new Error(
            "Selecione um cliente."
        );
    }


    if (!data) {

        throw new Error(
            "Informe a data do orçamento."
        );
    }


    const itens =
        obterItensFormulario();


    const total =
        itens.reduce(
            (
                soma,
                item
            ) =>
                soma +
                item.total,
            0
        );


    const dados = {

        cliente_id:
            Number(
                cliente
            ),

        data:
            data,

        validade:
            validade,

        observacoes:
            observacoes,

        itens:
            itens,

        total:
            total
    };


    if (
        orcamentoEmEdicao
    ) {

        dados.status =
            orcamentoEmEdicao.status ||
            "Pendente";
    }


    return dados;
}


// ==========================================
// SALVAR ORÇAMENTO
// ==========================================

async function salvarOrcamento(
    event
) {

    event.preventDefault();


    let dados;


    try {

        dados =
            obterDadosFormulario();

    } catch (erro) {

        alert(
            erro.message
        );

        return;
    }


    const botao =
        document.getElementById(
            "btn-salvar-orcamento"
        );


    const editando =
        Boolean(
            orcamentoEmEdicao
        );


    try {

        if (botao) {

            botao.disabled =
                true;

            botao.textContent =
                editando
                    ? "Salvando alterações..."
                    : "Salvando...";
        }


        const url =
            editando
                ? `/api/orcamentos/${orcamentoEmEdicao.id}`
                : "/api/orcamentos";


        const metodo =
            editando
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
                "Não foi possível salvar o orçamento."
            );
        }


        // ======================================
        // NOVO
        // ======================================

        if (!editando) {

            alert(
                `Orçamento #${resultado.numero_orcamento} criado com sucesso!`
            );


            await carregarOrcamentos();


            // Abre imediatamente o orçamento criado

            await visualizarOrcamento(
                resultado.id
            );


            return;
        }


        // ======================================
        // EDIÇÃO
        // ======================================

        alert(
            "Alterações salvas com sucesso!"
        );


        await carregarOrcamentos();


        await visualizarOrcamento(
            orcamentoEmEdicao.id
        );


    } catch (erro) {

        console.error(
            "Erro ao salvar orçamento:",
            erro
        );


        alert(
            erro.message ||
            "Erro ao salvar orçamento."
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;


            botao.textContent =
                orcamentoEmEdicao
                    ? "Salvar alterações"
                    : "Salvar orçamento";
        }
    }
}


// ==========================================
// LIMPAR ITENS
// ==========================================

function limparItens() {

    const lista =
        document.getElementById(
            "lista-itens-orcamento"
        );


    if (!lista) {
        return;
    }


    lista.innerHTML =
        "";


    lista.appendChild(
        criarLinhaItem()
    );


    calcularTotalOrcamento();
}


// ==========================================
// PREENCHER ITENS NA EDIÇÃO
// ==========================================

function preencherItens(
    itens
) {

    const lista =
        document.getElementById(
            "lista-itens-orcamento"
        );


    if (!lista) {
        return;
    }


    lista.innerHTML =
        "";


    if (
        !Array.isArray(
            itens
        ) ||
        itens.length === 0
    ) {

        lista.appendChild(
            criarLinhaItem()
        );


        calcularTotalOrcamento();

        return;
    }


    itens.forEach(
        item => {

            lista.appendChild(
                criarLinhaItem(
                    item
                )
            );
        }
    );


    calcularTotalOrcamento();
}


// ==========================================
// CARREGAR ORÇAMENTOS
// ==========================================

async function carregarOrcamentos() {

    try {

        const resposta =
            await fetch(
                "/api/orcamentos"
            );


        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar os orçamentos."
            );
        }


        const dados =
            await resposta.json();


        orcamentos =
            Array.isArray(
                dados
            )
                ? dados
                : [];


        atualizarTabelaOrcamentos(
            orcamentos
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar orçamentos:",
            erro
        );


        orcamentos =
            [];


        atualizarTabelaOrcamentos(
            []
        );
    }
}


// ==========================================
// FILTROS
// ==========================================

function filtrarOrcamentos() {

    const campoBusca =
        document.getElementById(
            "busca-orcamento"
        );


    const filtroStatus =
        document.getElementById(
            "filtro-status-orcamento"
        );


    const busca =
        campoBusca
            ? campoBusca.value
                .toLowerCase()
                .trim()
            : "";


    const statusSelecionado =
        filtroStatus
            ? filtroStatus.value
            : "";


    const filtrados =
        orcamentos.filter(
            orcamento => {

                const numero =
                    String(
                        orcamento.numero_orcamento ||
                        ""
                    ).toLowerCase();


                const cliente =
                    String(
                        orcamento.cliente_nome ||
                        ""
                    ).toLowerCase();


                const correspondeBusca =
                    !busca ||
                    numero.includes(
                        busca
                    ) ||
                    cliente.includes(
                        busca
                    );


                const correspondeStatus =
                    !statusSelecionado ||
                    orcamento.status ===
                    statusSelecionado;


                return (
                    correspondeBusca &&
                    correspondeStatus
                );
            }
        );


    atualizarTabelaOrcamentos(
        filtrados
    );
}


// ==========================================
// TABELA
// ==========================================

function atualizarTabelaOrcamentos(
    listaOrcamentos
) {

    const tabela =
        document.getElementById(
            "lista-orcamentos"
        );


    if (!tabela) {
        return;
    }


    if (
        !listaOrcamentos ||
        listaOrcamentos.length === 0
    ) {

        tabela.innerHTML = `
            <tr>

                <td
                    colspan="6"
                    style="
                        text-align: center;
                        color: var(--text-light);
                        padding: 30px;
                    "
                >
                    Nenhum orçamento encontrado.
                </td>

            </tr>
        `;


        return;
    }


    tabela.innerHTML =
        listaOrcamentos
            .map(
                orcamento => {

                    let pedidoGerado =
                        "";


                    if (
                        orcamento.pedido_id
                    ) {

                        pedidoGerado = `

                            <div
                                style="
                                    margin-top: 5px;
                                    font-size: 12px;
                                "
                            >

                                ${
                                    orcamento.numero_pedido
                                        ? `Pedido #${escaparHTML(
                                            orcamento.numero_pedido
                                        )}`
                                        : "Pedido criado"
                                }

                            </div>
                        `;
                    }


                    return `
                        <tr>

                            <td>

                                <strong>
                                    #${escaparHTML(
                                        orcamento.numero_orcamento
                                    )}
                                </strong>

                                ${pedidoGerado}

                            </td>


                            <td>

                                ${escaparHTML(
                                    orcamento.cliente_nome ||
                                    "—"
                                )}

                            </td>


                            <td>

                                ${formatarData(
                                    orcamento.data
                                )}

                            </td>


                            <td>

                                <strong>

                                    ${formatarMoeda(
                                        orcamento.total
                                    )}

                                </strong>

                            </td>


                            <td>

                                ${criarStatusOrcamento(
                                    orcamento.status
                                )}

                            </td>


                            <td>

                                <div
                                    style="
                                        display: flex;
                                        gap: 6px;
                                        flex-wrap: wrap;
                                    "
                                >

                                    <button
                                        type="button"
                                        class="btn btn-secondary"
                                        onclick="visualizarOrcamento(${orcamento.id})"
                                    >
                                        Abrir
                                    </button>


                                    <button
                                        type="button"
                                        class="btn btn-secondary"
                                        onclick="abrirPdfDireto(${orcamento.id})"
                                    >
                                        PDF
                                    </button>


                                    ${
                                        orcamento.pedido_id

                                            ? `

                                                <a
                                                    href="pedido.html?id=${orcamento.pedido_id}"
                                                    class="btn btn-secondary"
                                                >
                                                    Pedido
                                                </a>

                                            `

                                            : ""
                                    }

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// ==========================================
// ABRIR ORÇAMENTO
// ==========================================

async function visualizarOrcamento(
    id
) {

    try {

        const resposta =
            await fetch(
                `/api/orcamentos/${id}`
            );


        const dados =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Não foi possível abrir o orçamento."
            );
        }


        const orcamento =
            dados.orcamento;


        orcamentoEmEdicao =
            orcamento;


        // ======================================
        // CAMPOS
        // ======================================

        document.getElementById(
            "orcamento-id"
        ).value =
            orcamento.id;


        document.getElementById(
            "numero-orcamento"
        ).value =
            `#${orcamento.numero_orcamento}`;


        document.getElementById(
            "cliente-orcamento"
        ).value =
            String(
                orcamento.cliente_id
            );


        document.getElementById(
            "data-orcamento"
        ).value =
            orcamento.data ||
            "";


        document.getElementById(
            "validade-orcamento"
        ).value =
            orcamento.validade ||
            "";


        document.getElementById(
            "observacoes-orcamento"
        ).value =
            orcamento.observacoes ||
            "";


        // ======================================
        // TÍTULO
        // ======================================

        const titulo =
            document.getElementById(
                "titulo-formulario-orcamento"
            );


        if (titulo) {

            titulo.textContent =
                `Orçamento #${orcamento.numero_orcamento}`;
        }


        const subtitulo =
            document.getElementById(
                "subtitulo-formulario-orcamento"
            );


        if (subtitulo) {

            subtitulo.textContent =
                `Cliente: ${orcamento.cliente_nome}`;
        }


        preencherItens(
            dados.itens
        );


        configurarModoEdicao(
            orcamento
        );


        mostrarFormulario();


    } catch (erro) {

        console.error(
            "Erro ao abrir orçamento:",
            erro
        );


        alert(
            erro.message ||
            "Erro ao abrir orçamento."
        );
    }
}


// ==========================================
// GERAR PDF
// ==========================================

function gerarPdfOrcamento() {

    if (
        !orcamentoEmEdicao
    ) {

        alert(
            "Salve o orçamento antes de gerar o PDF."
        );

        return;
    }


    // Abre o PDF em nova aba

    window.open(
        `/api/orcamentos/${orcamentoEmEdicao.id}/pdf`,
        "_blank"
    );
}


// PDF DIRETO PELA TABELA

function abrirPdfDireto(
    id
) {

    window.open(
        `/api/orcamentos/${id}/pdf`,
        "_blank"
    );
}


// ==========================================
// RECUSAR ORÇAMENTO
// ==========================================

async function recusarOrcamento() {

    if (
        !orcamentoEmEdicao
    ) {
        return;
    }


    if (
        orcamentoEmEdicao.pedido_id
    ) {

        alert(
            "Este orçamento já foi transformado em pedido."
        );

        return;
    }


    const confirmar =
        confirm(
            `Deseja marcar o orçamento #${orcamentoEmEdicao.numero_orcamento} como recusado?`
        );


    if (!confirmar) {
        return;
    }


    try {

        const resposta =
            await fetch(
                `/api/orcamentos/${orcamentoEmEdicao.id}/status`,
                {
                    method:
                        "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            status:
                                "Recusado"
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
                "Não foi possível alterar o orçamento."
            );
        }


        alert(
            "Orçamento marcado como recusado."
        );


        await carregarOrcamentos();


        await visualizarOrcamento(
            orcamentoEmEdicao.id
        );


    } catch (erro) {

        console.error(
            erro
        );


        alert(
            erro.message
        );
    }
}


// ==========================================
// APROVAR E CRIAR PEDIDO
// ==========================================

async function aprovarETransformarEmPedido() {

    if (
        !orcamentoEmEdicao
    ) {
        return;
    }


    if (
        orcamentoEmEdicao.pedido_id
    ) {

        alert(
            "Este orçamento já foi transformado em pedido."
        );

        return;
    }


    // ======================================
    // AVISO IMPORTANTE
    // ======================================

    const confirmar =
        confirm(
            `Deseja aprovar o orçamento #${orcamentoEmEdicao.numero_orcamento} e transformá-lo em um pedido?\n\nDepois da conversão, o orçamento não poderá mais ser alterado.`
        );


    if (!confirmar) {
        return;
    }


    const botao =
        document.getElementById(
            "btn-aprovar-orcamento"
        );


    try {

        if (botao) {

            botao.disabled =
                true;


            botao.textContent =
                "Criando pedido...";
        }


        // ======================================
        // SALVA ALTERAÇÕES ANTES DA CONVERSÃO
        // ======================================

        const dadosAtuais =
            obterDadosFormulario();


        dadosAtuais.status =
            orcamentoEmEdicao.status ||
            "Pendente";


        const respostaSalvar =
            await fetch(
                `/api/orcamentos/${orcamentoEmEdicao.id}`,
                {
                    method:
                        "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            dadosAtuais
                        )
                }
            );


        const resultadoSalvar =
            await lerRespostaJson(
                respostaSalvar
            );


        if (
            !respostaSalvar.ok
        ) {

            throw new Error(
                resultadoSalvar.erro ||
                "Não foi possível salvar as alterações antes da aprovação."
            );
        }


        // ======================================
        // CONVERTE EM PEDIDO
        // ======================================

        const resposta =
            await fetch(
                `/api/orcamentos/${orcamentoEmEdicao.id}/aprovar-e-criar-pedido`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({})
                }
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Não foi possível criar o pedido."
            );
        }


        alert(
            `Orçamento aprovado!\n\nPedido #${resultado.numero_pedido} criado com sucesso.`
        );


        await carregarOrcamentos();


        await visualizarOrcamento(
            orcamentoEmEdicao.id
        );


        // ======================================
        // PERGUNTA SE QUER ABRIR O PEDIDO
        // ======================================

        const abrirPedido =
            confirm(
                `Pedido #${resultado.numero_pedido} criado.\n\nDeseja abrir o pedido agora?`
            );


        if (abrirPedido) {

            window.location.href =
                `pedido.html?id=${resultado.pedido_id}`;
        }


    } catch (erro) {

        console.error(
            "Erro ao aprovar orçamento:",
            erro
        );


        alert(
            erro.message ||
            "Erro ao transformar orçamento em pedido."
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;


            botao.textContent =
                "Aprovar e transformar em pedido";
        }
    }
}


// ==========================================
// STATUS
// ==========================================

function criarClasseStatus(
    status
) {

    let classe =
        "status";


    switch (
        status
    ) {

        case "Pendente":

            classe +=
                " status-aguardando";

            break;


        case "Aprovado":

            classe +=
                " status-entregue";

            break;


        case "Recusado":

            classe +=
                " status-pronto";

            break;
    }


    return classe;
}


function criarStatusOrcamento(
    status
) {

    return `
        <span class="${criarClasseStatus(
            status
        )}">
            ${escaparHTML(
                status ||
                "—"
            )}
        </span>
    `;
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
// FORMATAÇÃO
// ==========================================

function formatarMoeda(
    valor
) {

    const numero =
        Number(
            valor
        );


    if (
        Number.isNaN(
            numero
        )
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
// SEGURANÇA HTML
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


function escaparAtributo(
    valor
) {

    return escaparHTML(
        valor
    );
}