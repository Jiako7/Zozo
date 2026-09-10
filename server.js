const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const PDFDocument = require("pdfkit");

const app = express();
const PORT = 3000;

const DATABASE_PATH = path.join(
    __dirname,
    "database",
    "database.sqlite"
);


// =====================================================
// MIDDLEWARES
// =====================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// =====================================================
// BANCO DE DADOS
// =====================================================

const db = new sqlite3.Database(
    DATABASE_PATH,
    erro => {

        if (erro) {

            console.error(
                "Erro ao conectar ao banco:",
                erro.message
            );

        } else {

            console.log(
                "Banco de dados conectado."
            );
        }
    }
);

db.run(
    "PRAGMA foreign_keys = ON"
);


// =====================================================
// SQLITE COM PROMISE
// =====================================================

function run(
    sql,
    params = []
) {

    return new Promise(
        (resolve, reject) => {

            db.run(
                sql,
                params,
                function (erro) {

                    if (erro) {

                        reject(erro);
                        return;
                    }

                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });
                }
            );
        }
    );
}


function get(
    sql,
    params = []
) {

    return new Promise(
        (resolve, reject) => {

            db.get(
                sql,
                params,
                (erro, row) => {

                    if (erro) {

                        reject(erro);
                        return;
                    }

                    resolve(row);
                }
            );
        }
    );
}


function all(
    sql,
    params = []
) {

    return new Promise(
        (resolve, reject) => {

            db.all(
                sql,
                params,
                (erro, rows) => {

                    if (erro) {

                        reject(erro);
                        return;
                    }

                    resolve(rows);
                }
            );
        }
    );
}


// =====================================================
// INICIALIZAÇÃO DO BANCO
// =====================================================

async function inicializarBanco() {

    // =================================================
    // CLIENTES
    // =================================================

    await run(`
        CREATE TABLE IF NOT EXISTS clientes (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            nome TEXT NOT NULL,

            telefone TEXT,

            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


    // =================================================
    // PEDIDOS
    // =================================================

    await run(`
        CREATE TABLE IF NOT EXISTS pedidos (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            numero_pedido TEXT NOT NULL UNIQUE,

            cliente_id INTEGER NOT NULL,

            servico TEXT NOT NULL,

            descricao TEXT,

            data_entrada TEXT NOT NULL,

            data_entrega TEXT,

            data_conclusao TEXT,

            valor REAL DEFAULT 0,

            forma_pagamento TEXT,

            situacao_pagamento TEXT NOT NULL
                DEFAULT 'Pendente',

            status TEXT NOT NULL
                DEFAULT 'Aguardando',

            observacoes TEXT,

            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (cliente_id)
                REFERENCES clientes(id)
        )
    `);


    // =================================================
    // HISTÓRICO DE STATUS
    // =================================================

    await run(`
        CREATE TABLE IF NOT EXISTS historico_status (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            pedido_id INTEGER NOT NULL,

            status TEXT NOT NULL,

            data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (pedido_id)
                REFERENCES pedidos(id)
                ON DELETE CASCADE
        )
    `);


    // =================================================
    // DESPESAS
    // =================================================

    await run(`
        CREATE TABLE IF NOT EXISTS despesas (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            descricao TEXT NOT NULL,

            categoria TEXT NOT NULL,

            valor REAL NOT NULL DEFAULT 0,

            data TEXT NOT NULL,

            observacao TEXT,

            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


    // =================================================
    // ORÇAMENTOS
    // =================================================

    await run(`
        CREATE TABLE IF NOT EXISTS orcamentos (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            numero_orcamento TEXT NOT NULL UNIQUE,

            cliente_id INTEGER NOT NULL,

            data TEXT NOT NULL,

            validade TEXT,

            total REAL NOT NULL DEFAULT 0,

            status TEXT NOT NULL DEFAULT 'Pendente',

            observacoes TEXT,

            pedido_id INTEGER,

            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (cliente_id)
                REFERENCES clientes(id),

            FOREIGN KEY (pedido_id)
                REFERENCES pedidos(id)
        )
    `);


    // =================================================
    // MIGRAÇÃO — PEDIDO_ID
    // =================================================

    const colunasOrcamento =
        await all(
            "PRAGMA table_info(orcamentos)"
        );

    const possuiPedidoId =
        colunasOrcamento.some(
            coluna =>
                coluna.name ===
                "pedido_id"
        );

    if (!possuiPedidoId) {

        await run(`
            ALTER TABLE orcamentos
            ADD COLUMN pedido_id INTEGER
        `);

        console.log(
            "Coluna pedido_id adicionada."
        );
    }


    // =================================================
    // ITENS DE ORÇAMENTO
    // =================================================

    await run(`
        CREATE TABLE IF NOT EXISTS itens_orcamento (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            orcamento_id INTEGER NOT NULL,

            quantidade TEXT NOT NULL,

            descricao TEXT NOT NULL,

            valor_unitario REAL NOT NULL DEFAULT 0,

            total REAL NOT NULL DEFAULT 0,

            FOREIGN KEY (orcamento_id)
                REFERENCES orcamentos(id)
                ON DELETE CASCADE
        )
    `);


    // =================================================
    // LOG GERAL DO SISTEMA
    // =================================================

    await run(`
        CREATE TABLE IF NOT EXISTS logs_sistema (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

            acao TEXT NOT NULL,

            categoria TEXT NOT NULL,

            registro_id INTEGER,

            descricao TEXT NOT NULL
        )
    `);


    console.log(
        "Tabelas verificadas/criadas."
    );
}


// =====================================================
// CONFIGURAÇÕES
// =====================================================

const statusPermitidos = [
    "Aguardando",
    "Em andamento",
    "Pronto",
    "Entregue"
];


const situacoesPagamentoPermitidas = [
    "Pendente",
    "Pago"
];


const statusOrcamentoPermitidos = [
    "Pendente",
    "Aprovado",
    "Recusado"
];


// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function numeroMoeda(valor) {

    return Number(
        valor || 0
    ).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function formatarDataBR(data) {

    if (!data) {
        return "—";
    }

    const partes =
        String(data).split("-");

    if (
        partes.length !== 3
    ) {
        return String(data);
    }

    return (
        `${partes[2]}/` +
        `${partes[1]}/` +
        `${partes[0]}`
    );
}


function dataHojeBrasil() {

    const partes =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "America/Sao_Paulo",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        ).formatToParts(
            new Date()
        );

    const mapa =
        Object.fromEntries(
            partes.map(
                parte => [
                    parte.type,
                    parte.value
                ]
            )
        );

    return (
        `${mapa.year}-` +
        `${mapa.month}-` +
        `${mapa.day}`
    );
}


function extrairQuantidadeNumerica(
    valor
) {

    const texto =
        String(
            valor || ""
        )
            .replace(",", ".")
            .trim();

    const correspondencia =
        texto.match(
            /\d+(?:\.\d+)?/
        );

    if (!correspondencia) {
        return 0;
    }

    const numero =
        Number(
            correspondencia[0]
        );

    if (
        Number.isNaN(numero)
    ) {
        return 0;
    }

    return numero;
}


// =====================================================
// REGISTRAR LOG
// =====================================================

async function registrarLog(
    acao,
    categoria,
    registroId,
    descricao
) {

    try {

        await run(
            `
            INSERT INTO logs_sistema (

                acao,
                categoria,
                registro_id,
                descricao

            )
            VALUES (?, ?, ?, ?)
            `,
            [
                acao,
                categoria,
                registroId || null,
                descricao
            ]
        );

    } catch (erro) {

        console.error(
            "Erro ao registrar log:",
            erro
        );
    }
}


// =====================================================
// GERAR Nº PEDIDO
// =====================================================

async function gerarNumeroPedido() {

    const ultimo =
        await get(`
            SELECT numero_pedido
            FROM pedidos
            ORDER BY id DESC
            LIMIT 1
        `);

    const atual =
        ultimo?.numero_pedido
            ? parseInt(
                ultimo.numero_pedido,
                10
            )
            : 0;

    const proximo =
        Number.isNaN(atual)
            ? 1
            : atual + 1;

    return String(
        proximo
    ).padStart(
        6,
        "0"
    );
}


// =====================================================
// GERAR Nº ORÇAMENTO
// =====================================================

async function gerarNumeroOrcamento() {

    const ultimo =
        await get(`
            SELECT numero_orcamento
            FROM orcamentos
            ORDER BY id DESC
            LIMIT 1
        `);

    const atual =
        ultimo?.numero_orcamento
            ? parseInt(
                ultimo.numero_orcamento,
                10
            )
            : 0;

    const proximo =
        Number.isNaN(atual)
            ? 1
            : atual + 1;

    return String(
        proximo
    ).padStart(
        6,
        "0"
    );
}


// =====================================================
// VALIDAR ITENS DE ORÇAMENTO
// =====================================================

function validarItensOrcamento(
    itens
) {

    if (
        !Array.isArray(itens) ||
        itens.length === 0
    ) {

        throw new Error(
            "O orçamento precisa ter pelo menos um item."
        );
    }

    return itens.map(
        item => {

            const quantidade =
                String(
                    item.quantidade || ""
                ).trim();

            const descricao =
                String(
                    item.descricao || ""
                ).trim();

            const valorUnitario =
                Number(
                    item.valor_unitario
                );

            const quantidadeNumerica =
                extrairQuantidadeNumerica(
                    quantidade
                );

            if (!quantidade) {

                throw new Error(
                    "A quantidade de um item não foi informada."
                );
            }

            if (
                quantidadeNumerica <= 0
            ) {

                throw new Error(
                    `A quantidade "${quantidade}" é inválida.`
                );
            }

            if (!descricao) {

                throw new Error(
                    "A descrição de um item não foi informada."
                );
            }

            if (
                Number.isNaN(
                    valorUnitario
                ) ||
                valorUnitario < 0
            ) {

                throw new Error(
                    "O valor unitário é inválido."
                );
            }

            return {

                quantidade,

                descricao,

                valor_unitario:
                    valorUnitario,

                total:
                    quantidadeNumerica *
                    valorUnitario
            };
        }
    );
}


// =====================================================
// INSERIR ITENS
// =====================================================

async function inserirItensOrcamento(
    orcamentoId,
    itens
) {

    for (
        const item
        of itens
    ) {

        await run(
            `
            INSERT INTO itens_orcamento (

                orcamento_id,

                quantidade,

                descricao,

                valor_unitario,

                total
            )

            VALUES (?, ?, ?, ?, ?)
            `,
            [
                orcamentoId,

                item.quantidade,

                item.descricao,

                item.valor_unitario,

                item.total
            ]
        );
    }
}


// =====================================================
// BUSCAR ORÇAMENTO COMPLETO
// =====================================================

async function buscarOrcamentoCompleto(
    id
) {

    const orcamento =
        await get(
            `
            SELECT

                o.*,

                c.nome
                    AS cliente_nome,

                c.telefone
                    AS cliente_telefone,

                p.numero_pedido

            FROM orcamentos o

            INNER JOIN clientes c
                ON c.id =
                o.cliente_id

            LEFT JOIN pedidos p
                ON p.id =
                o.pedido_id

            WHERE o.id = ?
            `,
            [
                id
            ]
        );

    if (!orcamento) {
        return null;
    }

    const itens =
        await all(
            `
            SELECT

                id,

                quantidade,

                descricao,

                valor_unitario,

                total

            FROM itens_orcamento

            WHERE orcamento_id = ?

            ORDER BY id ASC
            `,
            [
                id
            ]
        );

    return {
        orcamento,
        itens
    };
}


// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );
    }
);


// =====================================================
// API — CLIENTES
// =====================================================

app.get(
    "/api/clientes",
    async (req, res) => {

        try {

            const clientes =
                await all(`
                    SELECT

                        c.id,

                        c.nome,

                        c.telefone,

                        c.criado_em,

                        COUNT(
                            DISTINCT p.id
                        ) AS total_pedidos,

                        COALESCE(
                            SUM(p.valor),
                            0
                        ) AS total_gasto

                    FROM clientes c

                    LEFT JOIN pedidos p
                        ON p.cliente_id =
                        c.id

                    GROUP BY c.id

                    ORDER BY c.nome ASC
                `);

            res.json(
                clientes
            );

        } catch (erro) {

            console.error(
                "Erro clientes:",
                erro
            );

            res.status(
                500
            ).json({
                erro:
                    "Erro ao buscar clientes.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.post(
    "/api/clientes",
    async (req, res) => {

        try {

            const nome =
                String(
                    req.body.nome || ""
                ).trim();

            const telefone =
                req.body.telefone ||
                null;

            if (!nome) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O nome do cliente é obrigatório."
                    });
            }

            const resultado =
                await run(
                    `
                    INSERT INTO clientes (
                        nome,
                        telefone
                    )
                    VALUES (?, ?)
                    `,
                    [
                        nome,
                        telefone
                    ]
                );

            await registrarLog(
                "Criação",
                "Clientes",
                resultado.id,
                `Cliente "${nome}" cadastrado.`
            );

            res.status(
                201
            ).json({

                id:
                    resultado.id,

                mensagem:
                    "Cliente cadastrado com sucesso."
            });

        } catch (erro) {

            console.error(
                "Erro ao criar cliente:",
                erro
            );

            res.status(
                500
            ).json({
                erro:
                    "Erro ao cadastrar cliente.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.get(
    "/api/clientes/:id",
    async (req, res) => {

        try {

            const cliente =
                await get(
                    `
                    SELECT

                        c.id,

                        c.nome,

                        c.telefone,

                        c.criado_em,

                        COUNT(
                            DISTINCT p.id
                        ) AS total_pedidos,

                        COALESCE(
                            SUM(p.valor),
                            0
                        ) AS total_gasto

                    FROM clientes c

                    LEFT JOIN pedidos p
                        ON p.cliente_id =
                        c.id

                    WHERE c.id = ?

                    GROUP BY c.id
                    `,
                    [
                        req.params.id
                    ]
                );

            if (!cliente) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Cliente não encontrado."
                    });
            }

            res.json(
                cliente
            );

        } catch (erro) {

            res.status(
                500
            ).json({
                erro:
                    "Erro ao buscar cliente.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.put(
    "/api/clientes/:id",
    async (req, res) => {

        try {

            const cliente =
                await get(
                    `
                    SELECT *
                    FROM clientes
                    WHERE id = ?
                    `,
                    [
                        req.params.id
                    ]
                );

            if (!cliente) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Cliente não encontrado."
                    });
            }

            const nome =
                String(
                    req.body.nome || ""
                ).trim();

            const telefone =
                req.body.telefone ||
                null;

            if (!nome) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O nome é obrigatório."
                    });
            }

            await run(
                `
                UPDATE clientes
                SET
                    nome = ?,
                    telefone = ?
                WHERE id = ?
                `,
                [
                    nome,
                    telefone,
                    req.params.id
                ]
            );

            await registrarLog(
                "Alteração",
                "Clientes",
                req.params.id,
                `Cliente "${cliente.nome}" alterado para "${nome}".`
            );

            res.json({
                mensagem:
                    "Cliente atualizado com sucesso."
            });

        } catch (erro) {

            res.status(
                500
            ).json({
                erro:
                    "Erro ao atualizar cliente.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.delete(
    "/api/clientes/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;

            const cliente =
                await get(
                    `
                    SELECT *
                    FROM clientes
                    WHERE id = ?
                    `,
                    [
                        id
                    ]
                );

            if (!cliente) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Cliente não encontrado."
                    });
            }

            const pedidos =
                await get(
                    `
                    SELECT COUNT(*) AS total
                    FROM pedidos
                    WHERE cliente_id = ?
                    `,
                    [
                        id
                    ]
                );

            const orcamentos =
                await get(
                    `
                    SELECT COUNT(*) AS total
                    FROM orcamentos
                    WHERE cliente_id = ?
                    `,
                    [
                        id
                    ]
                );

            if (
                Number(
                    pedidos?.total || 0
                ) > 0 ||
                Number(
                    orcamentos?.total || 0
                ) > 0
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Não é possível excluir um cliente que possui pedidos ou orçamentos."
                    });
            }

            await run(
                `
                DELETE FROM clientes
                WHERE id = ?
                `,
                [
                    id
                ]
            );

            await registrarLog(
                "Exclusão",
                "Clientes",
                id,
                `Cliente "${cliente.nome}" excluído.`
            );

            res.json({
                mensagem:
                    "Cliente excluído com sucesso."
            });

        } catch (erro) {

            res.status(
                500
            ).json({
                erro:
                    "Erro ao excluir cliente.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// API — PEDIDOS
// =====================================================

app.get(
    "/api/pedidos",
    async (req, res) => {

        try {

            let sql = `
                SELECT

                    p.*,

                    c.nome
                        AS cliente_nome,

                    c.telefone
                        AS cliente_telefone

                FROM pedidos p

                INNER JOIN clientes c
                    ON c.id =
                    p.cliente_id
            `;

            const parametros = [];
            const condicoes = [];

            if (
                req.query.status
            ) {

                condicoes.push(
                    "p.status = ?"
                );

                parametros.push(
                    req.query.status
                );
            }

            if (
                req.query.cliente_id
            ) {

                condicoes.push(
                    "p.cliente_id = ?"
                );

                parametros.push(
                    req.query.cliente_id
                );
            }

            if (
                condicoes.length > 0
            ) {

                sql +=
                    " WHERE " +
                    condicoes.join(
                        " AND "
                    );
            }

            sql += `
                ORDER BY

                    CASE
                        WHEN p.data_entrega IS NULL
                        THEN 1
                        ELSE 0
                    END,

                    p.data_entrega ASC,

                    p.id DESC
            `;

            const pedidos =
                await all(
                    sql,
                    parametros
                );

            res.json(
                pedidos
            );

        } catch (erro) {

            res.status(
                500
            ).json({
                erro:
                    "Erro ao buscar pedidos.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.get(
    "/api/pedidos/:id",
    async (req, res) => {

        try {

            const pedido =
                await get(
                    `
                    SELECT

                        p.*,

                        c.nome
                            AS cliente_nome,

                        c.telefone
                            AS cliente_telefone

                    FROM pedidos p

                    INNER JOIN clientes c
                        ON c.id =
                        p.cliente_id

                    WHERE p.id = ?
                    `,
                    [
                        req.params.id
                    ]
                );

            if (!pedido) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Pedido não encontrado."
                    });
            }

            const historico =
                await all(
                    `
                    SELECT *
                    FROM historico_status
                    WHERE pedido_id = ?
                    ORDER BY data_hora ASC
                    `,
                    [
                        req.params.id
                    ]
                );

            res.json({
                pedido,
                historico
            });

        } catch (erro) {

            res.status(
                500
            ).json({
                erro:
                    "Erro ao buscar pedido.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.post(
    "/api/pedidos",
    async (req, res) => {

        try {

            const {
                cliente_id,
                servico,
                descricao,
                data_entrada,
                data_entrega,
                data_conclusao,
                valor,
                forma_pagamento,
                situacao_pagamento,
                status,
                observacoes
            } = req.body;

            if (!cliente_id) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O cliente é obrigatório."
                    });
            }

            if (
                !servico ||
                !String(
                    servico
                ).trim()
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O serviço é obrigatório."
                    });
            }

            if (!data_entrada) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "A data de entrada é obrigatória."
                    });
            }

            const cliente =
                await get(
                    `
                    SELECT id, nome
                    FROM clientes
                    WHERE id = ?
                    `,
                    [
                        cliente_id
                    ]
                );

            if (!cliente) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O cliente selecionado não existe."
                    });
            }

            const valorFinal =
                Number(valor);

            if (
                Number.isNaN(
                    valorFinal
                ) ||
                valorFinal < 0
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O valor informado é inválido."
                    });
            }

            const statusFinal =
                statusPermitidos.includes(
                    status
                )
                    ? status
                    : "Aguardando";

            const pagamentoFinal =
                situacoesPagamentoPermitidas.includes(
                    situacao_pagamento
                )
                    ? situacao_pagamento
                    : "Pendente";

            const numeroPedido =
                await gerarNumeroPedido();

            await run(
                "BEGIN TRANSACTION"
            );

            try {

                const resultado =
                    await run(
                        `
                        INSERT INTO pedidos (

                            numero_pedido,
                            cliente_id,
                            servico,
                            descricao,
                            data_entrada,
                            data_entrega,
                            data_conclusao,
                            valor,
                            forma_pagamento,
                            situacao_pagamento,
                            status,
                            observacoes
                        )

                        VALUES (
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?
                        )
                        `,
                        [
                            numeroPedido,
                            cliente_id,

                            String(
                                servico
                            ).trim(),

                            descricao || null,

                            data_entrada,

                            data_entrega || null,

                            data_conclusao || null,

                            valorFinal,

                            forma_pagamento || null,

                            pagamentoFinal,

                            statusFinal,

                            observacoes || null
                        ]
                    );

                await run(
                    `
                    INSERT INTO historico_status (
                        pedido_id,
                        status
                    )
                    VALUES (?, ?)
                    `,
                    [
                        resultado.id,
                        statusFinal
                    ]
                );

                await run(
                    "COMMIT"
                );

                await registrarLog(
                    "Criação",
                    "Pedidos",
                    resultado.id,
                    `Pedido #${numeroPedido} criado para ${cliente.nome}. Valor: ${numeroMoeda(valorFinal)}.`
                );

                res.status(
                    201
                ).json({

                    id:
                        resultado.id,

                    numero_pedido:
                        numeroPedido,

                    mensagem:
                        "Pedido criado com sucesso."
                });

            } catch (erro) {

                await run(
                    "ROLLBACK"
                ).catch(
                    () => {}
                );

                throw erro;
            }

        } catch (erro) {

            console.error(
                "Erro ao criar pedido:",
                erro
            );

            res.status(
                500
            ).json({
                erro:
                    "Erro ao criar pedido.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.put(
    "/api/pedidos/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;

            const pedidoAtual =
                await get(
                    `
                    SELECT *
                    FROM pedidos
                    WHERE id = ?
                    `,
                    [
                        id
                    ]
                );

            if (!pedidoAtual) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Pedido não encontrado."
                    });
            }

            const {
                cliente_id,
                servico,
                descricao,
                data_entrada,
                data_entrega,
                data_conclusao,
                valor,
                forma_pagamento,
                situacao_pagamento,
                status,
                observacoes
            } = req.body;

            if (!cliente_id) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O cliente é obrigatório."
                    });
            }

            if (
                !servico ||
                !String(
                    servico
                ).trim()
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O serviço é obrigatório."
                    });
            }

            if (!data_entrada) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "A data de entrada é obrigatória."
                    });
            }

            const cliente =
                await get(
                    `
                    SELECT id
                    FROM clientes
                    WHERE id = ?
                    `,
                    [
                        cliente_id
                    ]
                );

            if (!cliente) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Cliente inválido."
                    });
            }

            const novoStatus =
                status ||
                pedidoAtual.status;

            const novoPagamento =
                situacao_pagamento ||
                pedidoAtual.situacao_pagamento ||
                "Pendente";

            if (
                !statusPermitidos.includes(
                    novoStatus
                )
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Status inválido."
                    });
            }

            if (
                !situacoesPagamentoPermitidas.includes(
                    novoPagamento
                )
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Situação de pagamento inválida."
                    });
            }

            const valorFinal =
                Number(valor);

            if (
                Number.isNaN(
                    valorFinal
                ) ||
                valorFinal < 0
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O valor informado é inválido."
                    });
            }

            await run(
                "BEGIN TRANSACTION"
            );

            try {

                await run(
                    `
                    UPDATE pedidos

                    SET
                        cliente_id = ?,
                        servico = ?,
                        descricao = ?,
                        data_entrada = ?,
                        data_entrega = ?,
                        data_conclusao = ?,
                        valor = ?,
                        forma_pagamento = ?,
                        situacao_pagamento = ?,
                        status = ?,
                        observacoes = ?

                    WHERE id = ?
                    `,
                    [
                        cliente_id,

                        String(
                            servico
                        ).trim(),

                        descricao || null,

                        data_entrada,

                        data_entrega || null,

                        data_conclusao || null,

                        valorFinal,

                        forma_pagamento || null,

                        novoPagamento,

                        novoStatus,

                        observacoes || null,

                        id
                    ]
                );

                if (
                    novoStatus !==
                    pedidoAtual.status
                ) {

                    await run(
                        `
                        INSERT INTO historico_status (
                            pedido_id,
                            status
                        )
                        VALUES (?, ?)
                        `,
                        [
                            id,
                            novoStatus
                        ]
                    );
                }

                await run(
                    "COMMIT"
                );

                let descricaoLog =
                    `Pedido #${pedidoAtual.numero_pedido} atualizado.`;

                if (
                    novoStatus !==
                    pedidoAtual.status
                ) {

                    descricaoLog +=
                        ` Status: ${pedidoAtual.status} → ${novoStatus}.`;
                }

                if (
                    novoPagamento !==
                    pedidoAtual.situacao_pagamento
                ) {

                    descricaoLog +=
                        ` Pagamento: ${pedidoAtual.situacao_pagamento} → ${novoPagamento}.`;
                }

                if (
                    Number(
                        pedidoAtual.valor
                    ) !==
                    valorFinal
                ) {

                    descricaoLog +=
                        ` Valor: ${numeroMoeda(pedidoAtual.valor)} → ${numeroMoeda(valorFinal)}.`;
                }

                await registrarLog(
                    "Alteração",
                    "Pedidos",
                    id,
                    descricaoLog
                );

                res.json({
                    mensagem:
                        "Pedido atualizado com sucesso."
                });

            } catch (erro) {

                await run(
                    "ROLLBACK"
                ).catch(
                    () => {}
                );

                throw erro;
            }

        } catch (erro) {

            console.error(
                "Erro ao atualizar pedido:",
                erro
            );

            res.status(
                500
            ).json({
                erro:
                    "Erro ao atualizar pedido.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.patch(
    "/api/pedidos/:id/status",
    async (req, res) => {

        try {

            const status =
                req.body.status;

            if (
                !statusPermitidos.includes(
                    status
                )
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Status inválido."
                    });
            }

            const pedido =
                await get(
                    `
                    SELECT
                        id,
                        numero_pedido,
                        status
                    FROM pedidos
                    WHERE id = ?
                    `,
                    [
                        req.params.id
                    ]
                );

            if (!pedido) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Pedido não encontrado."
                    });
            }

            if (
                pedido.status === status
            ) {

                return res.json({
                    mensagem:
                        "O pedido já possui esse status."
                });
            }

            await run(
                "BEGIN TRANSACTION"
            );

            try {

                await run(
                    `
                    UPDATE pedidos
                    SET status = ?
                    WHERE id = ?
                    `,
                    [
                        status,
                        req.params.id
                    ]
                );

                await run(
                    `
                    INSERT INTO historico_status (
                        pedido_id,
                        status
                    )
                    VALUES (?, ?)
                    `,
                    [
                        req.params.id,
                        status
                    ]
                );

                await run(
                    "COMMIT"
                );

                await registrarLog(
                    "Status",
                    "Pedidos",
                    pedido.id,
                    `Pedido #${pedido.numero_pedido}: ${pedido.status} → ${status}.`
                );

                res.json({
                    mensagem:
                        "Status atualizado com sucesso."
                });

            } catch (erro) {

                await run(
                    "ROLLBACK"
                ).catch(
                    () => {}
                );

                throw erro;
            }

        } catch (erro) {

            res.status(
                500
            ).json({
                erro:
                    "Erro ao alterar status.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// API — DESPESAS
// =====================================================

async function cadastrarDespesa(
    req,
    res
) {

    try {

        const descricao =
            String(
                req.body.descricao || ""
            ).trim();

        const categoria =
            String(
                req.body.categoria || ""
            ).trim();

        const valor =
            Number(
                req.body.valor
            );

        const data =
            req.body.data;

        const observacao =
            req.body.observacao ||
            null;

        if (!descricao) {

            return res
                .status(400)
                .json({
                    erro:
                        "A descrição da despesa é obrigatória."
                });
        }

        if (!categoria) {

            return res
                .status(400)
                .json({
                    erro:
                        "A categoria da despesa é obrigatória."
                });
        }

        if (!data) {

            return res
                .status(400)
                .json({
                    erro:
                        "A data da despesa é obrigatória."
                });
        }

        if (
            Number.isNaN(valor) ||
            valor <= 0
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "O valor da despesa deve ser maior que zero."
                });
        }

        const resultado =
            await run(
                `
                INSERT INTO despesas (

                    descricao,
                    categoria,
                    valor,
                    data,
                    observacao
                )

                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    descricao,
                    categoria,
                    valor,
                    data,
                    observacao
                ]
            );

        await registrarLog(
            "Criação",
            "Financeiro",
            resultado.id,
            `Despesa "${descricao}" cadastrada. Valor: ${numeroMoeda(valor)}.`
        );

        res.status(
            201
        ).json({

            id:
                resultado.id,

            mensagem:
                "Despesa cadastrada com sucesso."
        });

    } catch (erro) {

        res.status(
            500
        ).json({

            erro:
                "Erro ao cadastrar despesa.",

            detalhe:
                erro.message
        });
    }
}


app.post(
    "/api/despesas",
    cadastrarDespesa
);


app.post(
    "/despesas",
    cadastrarDespesa
);


app.get(
    "/api/despesas",
    async (req, res) => {

        try {

            const despesas =
                await all(`
                    SELECT

                        id,
                        descricao,
                        categoria,
                        valor,
                        data,
                        observacao,
                        criado_em

                    FROM despesas

                    ORDER BY
                        data DESC,
                        id DESC
                `);

            res.json(
                despesas
            );

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao buscar despesas.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.delete(
    "/api/despesas/:id",
    async (req, res) => {

        try {

            const despesa =
                await get(
                    `
                    SELECT *
                    FROM despesas
                    WHERE id = ?
                    `,
                    [
                        req.params.id
                    ]
                );

            if (!despesa) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Despesa não encontrada."
                    });
            }

            await run(
                `
                DELETE FROM despesas
                WHERE id = ?
                `,
                [
                    req.params.id
                ]
            );

            await registrarLog(
                "Exclusão",
                "Financeiro",
                despesa.id,
                `Despesa "${despesa.descricao}" excluída. Valor: ${numeroMoeda(despesa.valor)}.`
            );

            res.json({
                mensagem:
                    "Despesa excluída com sucesso."
            });

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao excluir despesa.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// API — ORÇAMENTOS
// =====================================================

app.get(
    "/api/orcamentos",
    async (req, res) => {

        try {

            let sql = `
                SELECT

                    o.id,

                    o.numero_orcamento,

                    o.cliente_id,

                    c.nome
                        AS cliente_nome,

                    c.telefone
                        AS cliente_telefone,

                    o.data,

                    o.validade,

                    o.total,

                    o.status,

                    o.observacoes,

                    o.pedido_id,

                    p.numero_pedido,

                    o.criado_em

                FROM orcamentos o

                INNER JOIN clientes c
                    ON c.id =
                    o.cliente_id

                LEFT JOIN pedidos p
                    ON p.id =
                    o.pedido_id
            `;

            const condicoes = [];
            const parametros = [];

            if (
                req.query.status
            ) {

                condicoes.push(
                    "o.status = ?"
                );

                parametros.push(
                    req.query.status
                );
            }

            if (
                req.query.cliente_id
            ) {

                condicoes.push(
                    "o.cliente_id = ?"
                );

                parametros.push(
                    req.query.cliente_id
                );
            }

            if (
                condicoes.length > 0
            ) {

                sql +=
                    " WHERE " +
                    condicoes.join(
                        " AND "
                    );
            }

            sql +=
                " ORDER BY o.id DESC";

            const orcamentos =
                await all(
                    sql,
                    parametros
                );

            res.json(
                orcamentos
            );

        } catch (erro) {

            console.error(
                "Erro ao buscar orçamentos:",
                erro
            );

            res.status(
                500
            ).json({

                erro:
                    "Erro ao buscar orçamentos.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.get(
    "/api/orcamentos/:id",
    async (req, res) => {

        try {

            const dados =
                await buscarOrcamentoCompleto(
                    req.params.id
                );

            if (!dados) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Orçamento não encontrado."
                    });
            }

            res.json(
                dados
            );

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao buscar orçamento.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.post(
    "/api/orcamentos",
    async (req, res) => {

        try {

            const clienteId =
                req.body.cliente_id;

            const data =
                req.body.data;

            const validade =
                req.body.validade ||
                null;

            const observacoes =
                req.body.observacoes ||
                null;

            if (!clienteId) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O cliente é obrigatório."
                    });
            }

            if (!data) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "A data do orçamento é obrigatória."
                    });
            }

            const cliente =
                await get(
                    `
                    SELECT id, nome
                    FROM clientes
                    WHERE id = ?
                    `,
                    [
                        clienteId
                    ]
                );

            if (!cliente) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O cliente selecionado não existe."
                    });
            }

            let itens;

            try {

                itens =
                    validarItensOrcamento(
                        req.body.itens
                    );

            } catch (erro) {

                return res
                    .status(400)
                    .json({
                        erro:
                            erro.message
                    });
            }

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

            const numeroOrcamento =
                await gerarNumeroOrcamento();

            await run(
                "BEGIN TRANSACTION"
            );

            try {

                const resultado =
                    await run(
                        `
                        INSERT INTO orcamentos (

                            numero_orcamento,
                            cliente_id,
                            data,
                            validade,
                            total,
                            status,
                            observacoes
                        )

                        VALUES (
                            ?, ?, ?, ?, ?,
                            'Pendente',
                            ?
                        )
                        `,
                        [
                            numeroOrcamento,

                            clienteId,

                            data,

                            validade,

                            total,

                            observacoes
                        ]
                    );

                await inserirItensOrcamento(
                    resultado.id,
                    itens
                );

                await run(
                    "COMMIT"
                );

                await registrarLog(
                    "Criação",
                    "Orçamentos",
                    resultado.id,
                    `Orçamento #${numeroOrcamento} criado para ${cliente.nome}. Total: ${numeroMoeda(total)}.`
                );

                res.status(
                    201
                ).json({

                    id:
                        resultado.id,

                    numero_orcamento:
                        numeroOrcamento,

                    mensagem:
                        "Orçamento criado com sucesso."
                });

            } catch (erro) {

                await run(
                    "ROLLBACK"
                ).catch(
                    () => {}
                );

                throw erro;
            }

        } catch (erro) {

            console.error(
                "Erro ao criar orçamento:",
                erro
            );

            res.status(
                500
            ).json({

                erro:
                    "Erro ao criar orçamento.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.put(
    "/api/orcamentos/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;

            const atual =
                await get(
                    `
                    SELECT *
                    FROM orcamentos
                    WHERE id = ?
                    `,
                    [
                        id
                    ]
                );

            if (!atual) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Orçamento não encontrado."
                    });
            }

            if (
                atual.pedido_id
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Este orçamento já foi transformado em pedido e não pode mais ser alterado."
                    });
            }

            const clienteId =
                req.body.cliente_id;

            const data =
                req.body.data;

            const validade =
                req.body.validade ||
                null;

            const observacoes =
                req.body.observacoes ||
                null;

            const status =
                req.body.status ||
                atual.status;

            if (!clienteId) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O cliente é obrigatório."
                    });
            }

            if (!data) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "A data do orçamento é obrigatória."
                    });
            }

            if (
                !statusOrcamentoPermitidos.includes(
                    status
                )
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Status do orçamento inválido."
                    });
            }

            const cliente =
                await get(
                    `
                    SELECT id
                    FROM clientes
                    WHERE id = ?
                    `,
                    [
                        clienteId
                    ]
                );

            if (!cliente) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Cliente inválido."
                    });
            }

            let itens;

            try {

                itens =
                    validarItensOrcamento(
                        req.body.itens
                    );

            } catch (erro) {

                return res
                    .status(400)
                    .json({
                        erro:
                            erro.message
                    });
            }

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

            await run(
                "BEGIN TRANSACTION"
            );

            try {

                await run(
                    `
                    UPDATE orcamentos

                    SET
                        cliente_id = ?,
                        data = ?,
                        validade = ?,
                        total = ?,
                        status = ?,
                        observacoes = ?

                    WHERE id = ?
                    `,
                    [
                        clienteId,

                        data,

                        validade,

                        total,

                        status,

                        observacoes,

                        id
                    ]
                );

                await run(
                    `
                    DELETE FROM itens_orcamento
                    WHERE orcamento_id = ?
                    `,
                    [
                        id
                    ]
                );

                await inserirItensOrcamento(
                    id,
                    itens
                );

                await run(
                    "COMMIT"
                );

                await registrarLog(
                    "Alteração",
                    "Orçamentos",
                    id,
                    `Orçamento #${atual.numero_orcamento} atualizado. Total: ${numeroMoeda(total)}.`
                );

                res.json({

                    mensagem:
                        "Orçamento atualizado com sucesso.",

                    total
                });

            } catch (erro) {

                await run(
                    "ROLLBACK"
                ).catch(
                    () => {}
                );

                throw erro;
            }

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao atualizar orçamento.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.patch(
    "/api/orcamentos/:id/status",
    async (req, res) => {

        try {

            const status =
                req.body.status;

            if (
                !statusOrcamentoPermitidos.includes(
                    status
                )
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Status do orçamento inválido."
                    });
            }

            const orcamento =
                await get(
                    `
                    SELECT *
                    FROM orcamentos
                    WHERE id = ?
                    `,
                    [
                        req.params.id
                    ]
                );

            if (!orcamento) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Orçamento não encontrado."
                    });
            }

            if (
                orcamento.pedido_id &&
                status !== "Aprovado"
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Um orçamento já convertido em pedido deve permanecer como Aprovado."
                    });
            }

            await run(
                `
                UPDATE orcamentos
                SET status = ?
                WHERE id = ?
                `,
                [
                    status,
                    req.params.id
                ]
            );

            if (
                orcamento.status !==
                status
            ) {

                await registrarLog(
                    "Status",
                    "Orçamentos",
                    orcamento.id,
                    `Orçamento #${orcamento.numero_orcamento}: ${orcamento.status} → ${status}.`
                );
            }

            res.json({
                mensagem:
                    "Status do orçamento atualizado com sucesso."
            });

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao alterar status do orçamento.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.delete(
    "/api/orcamentos/:id",
    async (req, res) => {

        try {

            const orcamento =
                await get(
                    `
                    SELECT *
                    FROM orcamentos
                    WHERE id = ?
                    `,
                    [
                        req.params.id
                    ]
                );

            if (!orcamento) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Orçamento não encontrado."
                    });
            }

            if (
                orcamento.pedido_id
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Este orçamento já virou um pedido e não pode ser excluído por esta tela."
                    });
            }

            await run(
                `
                DELETE FROM orcamentos
                WHERE id = ?
                `,
                [
                    req.params.id
                ]
            );

            await registrarLog(
                "Exclusão",
                "Orçamentos",
                orcamento.id,
                `Orçamento #${orcamento.numero_orcamento} excluído. Total: ${numeroMoeda(orcamento.total)}.`
            );

            res.json({
                mensagem:
                    "Orçamento excluído com sucesso."
            });

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao excluir orçamento.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// PDF DO ORÇAMENTO
// =====================================================

app.get(
    "/api/orcamentos/:id/pdf",
    async (req, res) => {

        try {

            const dados =
                await buscarOrcamentoCompleto(
                    req.params.id
                );

            if (!dados) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Orçamento não encontrado."
                    });
            }

            const {
                orcamento,
                itens
            } = dados;

            const nomeArquivo =
                `orcamento-${orcamento.numero_orcamento}.pdf`;

            res.setHeader(
                "Content-Type",
                "application/pdf"
            );

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${nomeArquivo}"`
            );

            const doc =
                new PDFDocument({
                    size: "A4",
                    margin: 45,
                    info: {
                        Title:
                            `Orçamento ${orcamento.numero_orcamento}`,

                        Author:
                            "Zozozito Confecções"
                    }
                });

            doc.pipe(res);

            doc
                .font(
                    "Helvetica-Bold"
                )
                .fontSize(15)
                .text(
                    "JACOB JOSÉ DA SILVA"
                );

            doc
                .font(
                    "Helvetica-Bold"
                )
                .fontSize(12)
                .text(
                    "Zozozito Confecções"
                );

            doc.moveDown(0.35);

            doc
                .font(
                    "Helvetica"
                )
                .fontSize(9.5);

            doc.text(
                "CNPJ: 14.297.333/0001-39"
            );

            doc.text(
                "Email: zozozito01@gmail.com"
            );

            doc.text(
                "Contato: (61) 99171-8360"
            );

            doc.moveDown(1.2);

            doc
                .font(
                    "Helvetica-Bold"
                )
                .fontSize(17)
                .text(
                    "ORÇAMENTO UNQ",
                    {
                        align:
                            "center"
                    }
                );

            doc.moveDown(1);

            doc
                .font(
                    "Helvetica"
                )
                .fontSize(10);

            doc.text(
                `Orçamento: #${orcamento.numero_orcamento}`
            );

            doc.text(
                `Cliente: ${orcamento.cliente_nome}`
            );

            if (
                orcamento.cliente_telefone
            ) {

                doc.text(
                    `Telefone: ${orcamento.cliente_telefone}`
                );
            }

            doc.text(
                `Data: ${formatarDataBR(orcamento.data)}`
            );

            if (
                orcamento.validade
            ) {

                doc.text(
                    `Validade: ${orcamento.validade}`
                );
            }

            doc.moveDown(1);

            const margemX = 45;

            const colunas = [
                90,
                235,
                90,
                90
            ];

            let y =
                doc.y;

            function desenharCelula(
                x,
                topo,
                largura,
                altura,
                texto,
                opcoes = {}
            ) {

                doc
                    .rect(
                        x,
                        topo,
                        largura,
                        altura
                    )
                    .stroke();

                doc
                    .font(
                        opcoes.negrito
                            ? "Helvetica-Bold"
                            : "Helvetica"
                    )
                    .fontSize(
                        opcoes.tamanho ||
                        9
                    )
                    .text(
                        String(
                            texto ?? ""
                        ),
                        x + 5,
                        topo + 7,
                        {
                            width:
                                largura - 10,

                            align:
                                opcoes.align ||
                                "left"
                        }
                    );
            }


            function cabecalhoTabela() {

                const altura =
                    28;

                let x =
                    margemX;

                desenharCelula(
                    x,
                    y,
                    colunas[0],
                    altura,
                    "QUANTIDADE",
                    {
                        negrito: true,
                        align: "center"
                    }
                );

                x +=
                    colunas[0];

                desenharCelula(
                    x,
                    y,
                    colunas[1],
                    altura,
                    "DESCRIÇÃO",
                    {
                        negrito: true,
                        align: "center"
                    }
                );

                x +=
                    colunas[1];

                desenharCelula(
                    x,
                    y,
                    colunas[2],
                    altura,
                    "VALOR UNIT.",
                    {
                        negrito: true,
                        align: "center"
                    }
                );

                x +=
                    colunas[2];

                desenharCelula(
                    x,
                    y,
                    colunas[3],
                    altura,
                    "TOTAL",
                    {
                        negrito: true,
                        align: "center"
                    }
                );

                y +=
                    altura;
            }


            cabecalhoTabela();


            for (
                const item
                of itens
            ) {

                const alturaTexto =
                    doc.heightOfString(
                        item.descricao,
                        {
                            width:
                                colunas[1] -
                                10
                        }
                    );

                const altura =
                    Math.max(
                        32,
                        alturaTexto +
                        14
                    );

                if (
                    y + altura >
                    doc.page.height - 80
                ) {

                    doc.addPage();

                    y = 45;

                    cabecalhoTabela();
                }

                let x =
                    margemX;

                desenharCelula(
                    x,
                    y,
                    colunas[0],
                    altura,
                    item.quantidade,
                    {
                        align:
                            "center"
                    }
                );

                x +=
                    colunas[0];

                desenharCelula(
                    x,
                    y,
                    colunas[1],
                    altura,
                    item.descricao
                );

                x +=
                    colunas[1];

                desenharCelula(
                    x,
                    y,
                    colunas[2],
                    altura,
                    numeroMoeda(
                        item.valor_unitario
                    ),
                    {
                        align:
                            "right"
                    }
                );

                x +=
                    colunas[2];

                desenharCelula(
                    x,
                    y,
                    colunas[3],
                    altura,
                    numeroMoeda(
                        item.total
                    ),
                    {
                        align:
                            "right"
                    }
                );

                y +=
                    altura;
            }


            const alturaTotal =
                35;

            if (
                y + alturaTotal >
                doc.page.height - 80
            ) {

                doc.addPage();
                y = 45;
            }

            desenharCelula(
                margemX,
                y,
                colunas[0] +
                colunas[1] +
                colunas[2],
                alturaTotal,
                "VALOR TOTAL",
                {
                    negrito:
                        true,

                    align:
                        "right",

                    tamanho:
                        10
                }
            );

            desenharCelula(
                margemX +
                colunas[0] +
                colunas[1] +
                colunas[2],
                y,
                colunas[3],
                alturaTotal,
                numeroMoeda(
                    orcamento.total
                ),
                {
                    negrito:
                        true,

                    align:
                        "right",

                    tamanho:
                        10
                }
            );

            y +=
                alturaTotal;

            if (
                orcamento.observacoes
            ) {

                doc.y =
                    y + 20;

                doc
                    .font(
                        "Helvetica-Bold"
                    )
                    .fontSize(10)
                    .text(
                        "Observações:"
                    );

                doc
                    .font(
                        "Helvetica"
                    )
                    .fontSize(10)
                    .text(
                        orcamento.observacoes
                    );
            }

            doc.end();

        } catch (erro) {

            console.error(
                "Erro ao gerar PDF:",
                erro
            );

            if (
                !res.headersSent
            ) {

                res.status(
                    500
                ).json({

                    erro:
                        "Erro ao gerar PDF do orçamento.",

                    detalhe:
                        erro.message
                });

            } else {

                res.end();
            }
        }
    }
);


// =====================================================
// APROVAR ORÇAMENTO E TRANSFORMAR EM PEDIDO
// =====================================================

app.post(
    "/api/orcamentos/:id/aprovar-e-criar-pedido",
    async (req, res) => {

        try {

            const dados =
                await buscarOrcamentoCompleto(
                    req.params.id
                );

            if (!dados) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Orçamento não encontrado."
                    });
            }

            const {
                orcamento,
                itens
            } = dados;

            if (
                orcamento.pedido_id
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Este orçamento já foi transformado em pedido.",

                        pedido_id:
                            orcamento.pedido_id,

                        numero_pedido:
                            orcamento.numero_pedido
                    });
            }

            if (
                itens.length === 0
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "O orçamento não possui itens."
                    });
            }

            const numeroPedido =
                await gerarNumeroPedido();

            const dataEntrada =
                dataHojeBrasil();

            const servico =
                itens.length === 1
                    ? itens[0].descricao
                    : `Serviços do orçamento #${orcamento.numero_orcamento}`;

            const descricao =
                itens
                    .map(
                        item => {

                            return (
                                `${item.quantidade} - ` +
                                `${item.descricao} - ` +
                                `${numeroMoeda(item.valor_unitario)} un. - ` +
                                `${numeroMoeda(item.total)}`
                            );
                        }
                    )
                    .join(
                        "\n"
                    );

            const observacoes =
                [
                    `Pedido criado a partir do orçamento #${orcamento.numero_orcamento}.`,

                    orcamento.observacoes ||
                    ""
                ]
                    .filter(
                        Boolean
                    )
                    .join(
                        "\n\n"
                    );

            await run(
                "BEGIN TRANSACTION"
            );

            try {

                const pedido =
                    await run(
                        `
                        INSERT INTO pedidos (

                            numero_pedido,
                            cliente_id,
                            servico,
                            descricao,
                            data_entrada,
                            data_entrega,
                            data_conclusao,
                            valor,
                            forma_pagamento,
                            situacao_pagamento,
                            status,
                            observacoes
                        )

                        VALUES (
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?
                        )
                        `,
                        [
                            numeroPedido,

                            orcamento.cliente_id,

                            servico,

                            descricao,

                            dataEntrada,

                            req.body.data_entrega ||
                            null,

                            null,

                            Number(
                                orcamento.total ||
                                0
                            ),

                            req.body.forma_pagamento ||
                            null,

                            "Pendente",

                            "Aguardando",

                            observacoes
                        ]
                    );

                await run(
                    `
                    INSERT INTO historico_status (
                        pedido_id,
                        status
                    )
                    VALUES (?, 'Aguardando')
                    `,
                    [
                        pedido.id
                    ]
                );

                const atualizacao =
                    await run(
                        `
                        UPDATE orcamentos

                        SET
                            status = 'Aprovado',

                            pedido_id = ?

                        WHERE
                            id = ?

                            AND pedido_id IS NULL
                        `,
                        [
                            pedido.id,
                            orcamento.id
                        ]
                    );

                if (
                    atualizacao.changes === 0
                ) {

                    throw new Error(
                        "O orçamento já foi convertido por outra operação."
                    );
                }

                await run(
                    "COMMIT"
                );

                await registrarLog(
                    "Aprovação",
                    "Orçamentos",
                    orcamento.id,
                    `Orçamento #${orcamento.numero_orcamento} aprovado e convertido no pedido #${numeroPedido}.`
                );

                await registrarLog(
                    "Criação",
                    "Pedidos",
                    pedido.id,
                    `Pedido #${numeroPedido} criado a partir do orçamento #${orcamento.numero_orcamento}. Valor: ${numeroMoeda(orcamento.total)}.`
                );

                res.status(
                    201
                ).json({

                    mensagem:
                        "Orçamento aprovado e transformado em pedido com sucesso.",

                    orcamento_id:
                        orcamento.id,

                    numero_orcamento:
                        orcamento.numero_orcamento,

                    pedido_id:
                        pedido.id,

                    numero_pedido:
                        numeroPedido
                });

            } catch (erro) {

                await run(
                    "ROLLBACK"
                ).catch(
                    () => {}
                );

                throw erro;
            }

        } catch (erro) {

            console.error(
                "Erro ao converter orçamento:",
                erro
            );

            res.status(
                500
            ).json({

                erro:
                    "Erro ao aprovar e transformar orçamento em pedido.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// CONFIGURAÇÕES — LOG DO SISTEMA
// =====================================================

app.get(
    "/api/configuracoes/logs",
    async (req, res) => {

        try {

            let sql = `
                SELECT
                    id,
                    data_hora,
                    acao,
                    categoria,
                    registro_id,
                    descricao

                FROM logs_sistema
            `;

            const condicoes = [];
            const parametros = [];

            if (
                req.query.categoria
            ) {

                condicoes.push(
                    "categoria = ?"
                );

                parametros.push(
                    req.query.categoria
                );
            }

            if (
                req.query.acao
            ) {

                condicoes.push(
                    "acao = ?"
                );

                parametros.push(
                    req.query.acao
                );
            }

            if (
                req.query.busca
            ) {

                condicoes.push(
                    "descricao LIKE ?"
                );

                parametros.push(
                    `%${req.query.busca}%`
                );
            }

            if (
                condicoes.length > 0
            ) {

                sql +=
                    " WHERE " +
                    condicoes.join(
                        " AND "
                    );
            }

            sql += `
                ORDER BY
                    id DESC
                LIMIT 500
            `;

            const logs =
                await all(
                    sql,
                    parametros
                );

            res.json(
                logs
            );

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao carregar o histórico.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.get(
    "/api/configuracoes/resumo",
    async (req, res) => {

        try {

            const [
                clientes,
                pedidos,
                orcamentos,
                despesas,
                logs
            ] =
                await Promise.all([

                    get(`
                        SELECT COUNT(*) AS total
                        FROM clientes
                    `),

                    get(`
                        SELECT COUNT(*) AS total
                        FROM pedidos
                    `),

                    get(`
                        SELECT COUNT(*) AS total
                        FROM orcamentos
                    `),

                    get(`
                        SELECT COUNT(*) AS total
                        FROM despesas
                    `),

                    get(`
                        SELECT COUNT(*) AS total
                        FROM logs_sistema
                    `)
                ]);

            res.json({

                clientes:
                    Number(
                        clientes?.total || 0
                    ),

                pedidos:
                    Number(
                        pedidos?.total || 0
                    ),

                orcamentos:
                    Number(
                        orcamentos?.total || 0
                    ),

                despesas:
                    Number(
                        despesas?.total || 0
                    ),

                logs:
                    Number(
                        logs?.total || 0
                    )
            });

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao carregar resumo dos dados.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.get(
    "/api/configuracoes/dados/:tipo",
    async (req, res) => {

        try {

            const tipo =
                req.params.tipo;

            let dados;

            if (
                tipo === "pedidos"
            ) {

                dados =
                    await all(`
                        SELECT

                            p.id,
                            p.numero_pedido,
                            p.servico,
                            p.valor,
                            p.status,
                            p.data_entrada,

                            c.nome
                                AS cliente_nome

                        FROM pedidos p

                        INNER JOIN clientes c
                            ON c.id =
                            p.cliente_id

                        ORDER BY p.id DESC
                    `);

            } else if (
                tipo === "orcamentos"
            ) {

                dados =
                    await all(`
                        SELECT

                            o.id,
                            o.numero_orcamento,
                            o.total,
                            o.status,
                            o.data,
                            o.pedido_id,

                            c.nome
                                AS cliente_nome

                        FROM orcamentos o

                        INNER JOIN clientes c
                            ON c.id =
                            o.cliente_id

                        ORDER BY o.id DESC
                    `);

            } else if (
                tipo === "clientes"
            ) {

                dados =
                    await all(`
                        SELECT

                            c.id,
                            c.nome,
                            c.telefone,
                            c.criado_em,

                            (
                                SELECT COUNT(*)
                                FROM pedidos p
                                WHERE p.cliente_id = c.id
                            ) AS total_pedidos,

                            (
                                SELECT COUNT(*)
                                FROM orcamentos o
                                WHERE o.cliente_id = c.id
                            ) AS total_orcamentos

                        FROM clientes c

                        ORDER BY c.nome ASC
                    `);

            } else if (
                tipo === "despesas"
            ) {

                dados =
                    await all(`
                        SELECT

                            id,
                            descricao,
                            categoria,
                            valor,
                            data,
                            criado_em

                        FROM despesas

                        ORDER BY
                            data DESC,
                            id DESC
                    `);

            } else {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Tipo de dado inválido."
                    });
            }

            res.json(
                dados
            );

        } catch (erro) {

            res.status(
                500
            ).json({

                erro:
                    "Erro ao carregar dados.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// EXCLUSÕES ADMINISTRATIVAS
// =====================================================

async function excluirPedidoAdministrativo(
    id
) {

    const pedido =
        await get(
            `
            SELECT

                p.*,

                c.nome
                    AS cliente_nome

            FROM pedidos p

            INNER JOIN clientes c
                ON c.id =
                p.cliente_id

            WHERE p.id = ?
            `,
            [
                id
            ]
        );

    if (!pedido) {

        throw new Error(
            "Pedido não encontrado."
        );
    }

    await run(
        `
        UPDATE orcamentos

        SET
            pedido_id = NULL,
            status = 'Pendente'

        WHERE pedido_id = ?
        `,
        [
            id
        ]
    );

    await run(
        `
        DELETE FROM pedidos
        WHERE id = ?
        `,
        [
            id
        ]
    );

    return pedido;
}


async function excluirOrcamentoAdministrativo(
    id
) {

    const orcamento =
        await get(
            `
            SELECT

                o.*,

                c.nome
                    AS cliente_nome

            FROM orcamentos o

            INNER JOIN clientes c
                ON c.id =
                o.cliente_id

            WHERE o.id = ?
            `,
            [
                id
            ]
        );

    if (!orcamento) {

        throw new Error(
            "Orçamento não encontrado."
        );
    }

    await run(
        `
        DELETE FROM orcamentos
        WHERE id = ?
        `,
        [
            id
        ]
    );

    return orcamento;
}


async function excluirClienteAdministrativo(
    id
) {

    const cliente =
        await get(
            `
            SELECT *
            FROM clientes
            WHERE id = ?
            `,
            [
                id
            ]
        );

    if (!cliente) {

        throw new Error(
            "Cliente não encontrado."
        );
    }

    const pedidos =
        await get(
            `
            SELECT COUNT(*) AS total
            FROM pedidos
            WHERE cliente_id = ?
            `,
            [
                id
            ]
        );

    const orcamentos =
        await get(
            `
            SELECT COUNT(*) AS total
            FROM orcamentos
            WHERE cliente_id = ?
            `,
            [
                id
            ]
        );

    await run(
        `
        DELETE FROM orcamentos
        WHERE cliente_id = ?
        `,
        [
            id
        ]
    );

    await run(
        `
        DELETE FROM pedidos
        WHERE cliente_id = ?
        `,
        [
            id
        ]
    );

    await run(
        `
        DELETE FROM clientes
        WHERE id = ?
        `,
        [
            id
        ]
    );

    return {

        ...cliente,

        total_pedidos:
            Number(
                pedidos?.total || 0
            ),

        total_orcamentos:
            Number(
                orcamentos?.total || 0
            )
    };
}


app.delete(
    "/api/configuracoes/dados/:tipo/:id",
    async (req, res) => {

        const tipo =
            req.params.tipo;

        const id =
            req.params.id;

        try {

            await run(
                "BEGIN TRANSACTION"
            );

            let descricaoLog;

            if (
                tipo === "pedidos"
            ) {

                const pedido =
                    await excluirPedidoAdministrativo(
                        id
                    );

                descricaoLog =
                    `Pedido #${pedido.numero_pedido} excluído pelas Configurações. Cliente: ${pedido.cliente_nome}. Valor: ${numeroMoeda(pedido.valor)}.`;

            } else if (
                tipo === "orcamentos"
            ) {

                const orcamento =
                    await excluirOrcamentoAdministrativo(
                        id
                    );

                descricaoLog =
                    `Orçamento #${orcamento.numero_orcamento} excluído pelas Configurações. Cliente: ${orcamento.cliente_nome}. Total: ${numeroMoeda(orcamento.total)}.`;

            } else if (
                tipo === "clientes"
            ) {

                const cliente =
                    await excluirClienteAdministrativo(
                        id
                    );

                descricaoLog =
                    `Cliente "${cliente.nome}" excluído pelas Configurações. Também foram removidos ${cliente.total_pedidos} pedido(s) e ${cliente.total_orcamentos} orçamento(s).`;

            } else if (
                tipo === "despesas"
            ) {

                const despesa =
                    await get(
                        `
                        SELECT *
                        FROM despesas
                        WHERE id = ?
                        `,
                        [
                            id
                        ]
                    );

                if (!despesa) {

                    throw new Error(
                        "Despesa não encontrada."
                    );
                }

                await run(
                    `
                    DELETE FROM despesas
                    WHERE id = ?
                    `,
                    [
                        id
                    ]
                );

                descricaoLog =
                    `Despesa "${despesa.descricao}" excluída pelas Configurações. Valor: ${numeroMoeda(despesa.valor)}.`;

            } else {

                await run(
                    "ROLLBACK"
                );

                return res
                    .status(400)
                    .json({
                        erro:
                            "Tipo de dado inválido."
                    });
            }

            await run(
                "COMMIT"
            );

            await registrarLog(
                "Exclusão",
                "Exclusões",
                Number(id),
                descricaoLog
            );

            res.json({
                mensagem:
                    "Registro excluído com sucesso."
            });

        } catch (erro) {

            await run(
                "ROLLBACK"
            ).catch(
                () => {}
            );

            res.status(
                erro.message.includes(
                    "não encontrad"
                )
                    ? 404
                    : 500
            ).json({

                erro:
                    erro.message ||
                    "Erro ao excluir registro."
            });
        }
    }
);


app.post(
    "/api/configuracoes/limpar/:tipo",
    async (req, res) => {

        const tipo =
            req.params.tipo;

        const confirmacao =
            String(
                req.body.confirmacao ||
                ""
            ).trim();

        const confirmacaoEsperada =
            `APAGAR ${tipo.toUpperCase()}`;

        if (
            confirmacao !==
            confirmacaoEsperada
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        `Digite "${confirmacaoEsperada}" para confirmar.`
                });
        }

        try {

            let total = 0;

            await run(
                "BEGIN TRANSACTION"
            );

            if (
                tipo === "pedidos"
            ) {

                const quantidade =
                    await get(`
                        SELECT COUNT(*) AS total
                        FROM pedidos
                    `);

                total =
                    Number(
                        quantidade?.total || 0
                    );

                await run(`
                    UPDATE orcamentos
                    SET
                        pedido_id = NULL,
                        status = 'Pendente'
                    WHERE pedido_id IS NOT NULL
                `);

                await run(`
                    DELETE FROM pedidos
                `);

            } else if (
                tipo === "orcamentos"
            ) {

                const quantidade =
                    await get(`
                        SELECT COUNT(*) AS total
                        FROM orcamentos
                    `);

                total =
                    Number(
                        quantidade?.total || 0
                    );

                await run(`
                    DELETE FROM orcamentos
                `);

            } else if (
                tipo === "despesas"
            ) {

                const quantidade =
                    await get(`
                        SELECT COUNT(*) AS total
                        FROM despesas
                    `);

                total =
                    Number(
                        quantidade?.total || 0
                    );

                await run(`
                    DELETE FROM despesas
                `);

            } else if (
                tipo === "clientes"
            ) {

                const quantidade =
                    await get(`
                        SELECT COUNT(*) AS total
                        FROM clientes
                    `);

                total =
                    Number(
                        quantidade?.total || 0
                    );

                await run(`
                    DELETE FROM orcamentos
                `);

                await run(`
                    DELETE FROM pedidos
                `);

                await run(`
                    DELETE FROM clientes
                `);

            } else if (
                tipo === "logs"
            ) {

                const quantidade =
                    await get(`
                        SELECT COUNT(*) AS total
                        FROM logs_sistema
                    `);

                total =
                    Number(
                        quantidade?.total || 0
                    );

                await run(`
                    DELETE FROM logs_sistema
                `);

            } else {

                await run(
                    "ROLLBACK"
                );

                return res
                    .status(400)
                    .json({
                        erro:
                            "Tipo de dado inválido."
                    });
            }

            await run(
                "COMMIT"
            );

            if (
                tipo !== "logs"
            ) {

                await registrarLog(
                    "Limpeza",
                    "Exclusões",
                    null,
                    `${total} registro(s) da categoria "${tipo}" foram apagados pelas Configurações.`
                );
            }

            res.json({

                mensagem:
                    `${total} registro(s) apagado(s) com sucesso.`,

                total
            });

        } catch (erro) {

            await run(
                "ROLLBACK"
            ).catch(
                () => {}
            );

            console.error(
                "Erro ao limpar dados:",
                erro
            );

            res.status(
                500
            ).json({

                erro:
                    "Erro ao limpar os dados.",

                detalhe:
                    erro.message
            });
        }
    }
);


app.post(
    "/api/configuracoes/apagar-tudo",
    async (req, res) => {

        const confirmacao =
            String(
                req.body.confirmacao ||
                ""
            ).trim();

        if (
            confirmacao !==
            "APAGAR TUDO"
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        'Digite exatamente "APAGAR TUDO" para confirmar.'
                });
        }

        try {

            await run(
                "BEGIN TRANSACTION"
            );

            await run(`
                DELETE FROM orcamentos
            `);

            await run(`
                DELETE FROM pedidos
            `);

            await run(`
                DELETE FROM clientes
            `);

            await run(`
                DELETE FROM despesas
            `);

            await run(`
                DELETE FROM logs_sistema
            `);

            await run(`
                DELETE FROM sqlite_sequence
                WHERE name IN (
                    'clientes',
                    'pedidos',
                    'historico_status',
                    'despesas',
                    'orcamentos',
                    'itens_orcamento',
                    'logs_sistema'
                )
            `);

            await run(
                "COMMIT"
            );

            res.json({
                mensagem:
                    "Todos os dados do sistema foram apagados com sucesso."
            });

        } catch (erro) {

            await run(
                "ROLLBACK"
            ).catch(
                () => {}
            );

            console.error(
                "Erro ao apagar todos os dados:",
                erro
            );

            res.status(
                500
            ).json({

                erro:
                    "Erro ao apagar todos os dados.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// DASHBOARD
// =====================================================

app.get(
    "/api/dashboard",
    async (req, res) => {

        try {

            const statusRows =
                await all(`
                    SELECT
                        status,
                        COUNT(*) AS total

                    FROM pedidos

                    GROUP BY status
                `);

            const status = {

                aguardando: 0,
                andamento: 0,
                pronto: 0,
                entregue: 0
            };

            for (
                const item
                of statusRows
            ) {

                if (
                    item.status ===
                    "Aguardando"
                ) {

                    status.aguardando =
                        Number(
                            item.total
                        );
                }

                if (
                    item.status ===
                    "Em andamento"
                ) {

                    status.andamento =
                        Number(
                            item.total
                        );
                }

                if (
                    item.status ===
                    "Pronto"
                ) {

                    status.pronto =
                        Number(
                            item.total
                        );
                }

                if (
                    item.status ===
                    "Entregue"
                ) {

                    status.entregue =
                        Number(
                            item.total
                        );
                }
            }


            const faturamento =
                await get(`
                    SELECT

                        COALESCE(
                            SUM(valor),
                            0
                        ) AS valor

                    FROM pedidos
                `);


            const recebido =
                await get(`
                    SELECT

                        COALESCE(
                            SUM(valor),
                            0
                        ) AS valor

                    FROM pedidos

                    WHERE
                        situacao_pagamento =
                        'Pago'
                `);


            const despesas =
                await get(`
                    SELECT

                        COALESCE(
                            SUM(valor),
                            0
                        ) AS valor

                    FROM despesas
                `);


            const pedidos =
                await all(`
                    SELECT

                        p.id,

                        p.numero_pedido
                            AS numero,

                        c.nome
                            AS cliente,

                        p.servico,

                        p.data_entrega
                            AS entrega,

                        p.status

                    FROM pedidos p

                    INNER JOIN clientes c
                        ON c.id =
                        p.cliente_id

                    WHERE
                        p.status !=
                        'Entregue'

                        AND
                        p.data_entrega
                        IS NOT NULL

                    ORDER BY
                        p.data_entrega ASC

                    LIMIT 6
                `);


            const totalFaturamento =
                Number(
                    faturamento?.valor || 0
                );

            const totalRecebido =
                Number(
                    recebido?.valor || 0
                );

            const totalDespesas =
                Number(
                    despesas?.valor || 0
                );


            res.json({

                status,

                financeiro: {

                    faturamento:
                        totalFaturamento,

                    recebido:
                        totalRecebido,

                    pendente:
                        Math.max(
                            0,
                            totalFaturamento -
                            totalRecebido
                        ),

                    despesas:
                        totalDespesas,

                    saldo:
                        totalRecebido -
                        totalDespesas
                },

                proximos:
                    pedidos.length,

                pedidos
            });

        } catch (erro) {

            console.error(
                "Erro dashboard:",
                erro
            );

            res.status(
                500
            ).json({

                erro:
                    "Erro ao carregar dashboard.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// API — DESEMPENHO FINANCEIRO
// =====================================================

function criarDataUTC(data) {

    return new Date(
        `${data}T00:00:00Z`
    );
}


function converterDataISO(data) {

    return data
        .toISOString()
        .slice(0, 10);
}


function adicionarDiasUTC(
    data,
    quantidade
) {

    const copia =
        new Date(
            data.getTime()
        );

    copia.setUTCDate(
        copia.getUTCDate() +
        quantidade
    );

    return copia;
}


function diasEntreInclusivo(
    inicio,
    fim
) {

    const msDia =
        24 * 60 * 60 * 1000;

    return (
        Math.floor(
            (
                criarDataUTC(fim) -
                criarDataUTC(inicio)
            ) /
            msDia
        ) + 1
    );
}


function obterPeriodoDesempenho(
    periodo,
    inicioPersonalizado,
    fimPersonalizado
) {

    const hojeTexto =
        dataHojeBrasil();

    const hoje =
        criarDataUTC(
            hojeTexto
        );

    let inicio;
    let fim = hoje;


    if (
        periodo === "semanal"
    ) {

        const diaSemana =
            hoje.getUTCDay();

        const deslocamento =
            diaSemana === 0
                ? 6
                : diaSemana - 1;

        inicio =
            adicionarDiasUTC(
                hoje,
                -deslocamento
            );
    }

    else if (
        periodo === "mensal"
    ) {

        inicio =
            new Date(
                Date.UTC(
                    hoje.getUTCFullYear(),
                    hoje.getUTCMonth(),
                    1
                )
            );
    }

    else if (
        periodo === "semestral"
    ) {

        const mesAtual =
            hoje.getUTCMonth();

        const mesInicial =
            mesAtual <= 5
                ? 0
                : 6;

        inicio =
            new Date(
                Date.UTC(
                    hoje.getUTCFullYear(),
                    mesInicial,
                    1
                )
            );
    }

    else if (
        periodo === "anual"
    ) {

        inicio =
            new Date(
                Date.UTC(
                    hoje.getUTCFullYear(),
                    0,
                    1
                )
            );
    }

    else if (
        periodo === "personalizado"
    ) {

        const regexData =
            /^\d{4}-\d{2}-\d{2}$/;

        if (
            !regexData.test(
                String(
                    inicioPersonalizado || ""
                )
            ) ||
            !regexData.test(
                String(
                    fimPersonalizado || ""
                )
            )
        ) {

            throw new Error(
                "Informe uma data inicial e uma data final válidas."
            );
        }

        inicio =
            criarDataUTC(
                inicioPersonalizado
            );

        fim =
            criarDataUTC(
                fimPersonalizado
            );

        if (
            Number.isNaN(
                inicio.getTime()
            ) ||
            Number.isNaN(
                fim.getTime()
            )
        ) {

            throw new Error(
                "O período personalizado possui datas inválidas."
            );
        }

        if (
            inicio > fim
        ) {

            throw new Error(
                "A data inicial não pode ser maior que a data final."
            );
        }
    }

    else {

        throw new Error(
            "Período de desempenho inválido."
        );
    }


    const inicioTexto =
        converterDataISO(
            inicio
        );

    const fimTexto =
        converterDataISO(
            fim
        );

    const quantidadeDias =
        diasEntreInclusivo(
            inicioTexto,
            fimTexto
        );

    const fimAnterior =
        adicionarDiasUTC(
            inicio,
            -1
        );

    const inicioAnterior =
        adicionarDiasUTC(
            fimAnterior,
            -(quantidadeDias - 1)
        );


    return {

        inicio:
            inicioTexto,

        fim:
            fimTexto,

        inicio_anterior:
            converterDataISO(
                inicioAnterior
            ),

        fim_anterior:
            converterDataISO(
                fimAnterior
            )
    };
}


// =====================================================
// MÉTRICAS DO DESEMPENHO
// =====================================================

async function calcularMetricasDesempenho(
    inicio,
    fim
) {

    const pedidos =
        await get(
            `
                SELECT

                    COUNT(*)
                        AS total_pedidos,

                    COALESCE(
                        SUM(valor),
                        0
                    ) AS faturamento,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN situacao_pagamento = 'Pago'
                                THEN valor
                                ELSE 0
                            END
                        ),
                        0
                    ) AS recebido,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN situacao_pagamento != 'Pago'
                                THEN valor
                                ELSE 0
                            END
                        ),
                        0
                    ) AS pendente

                FROM pedidos

                WHERE
                    date(data_entrada)
                    BETWEEN date(?) AND date(?)
            `,
            [
                inicio,
                fim
            ]
        );


    const entregues =
        await get(
            `
                SELECT
                    COUNT(*) AS total

                FROM pedidos

                WHERE
                    status = 'Entregue'

                    AND

                    date(
                        COALESCE(
                            data_conclusao,
                            data_entrega,
                            data_entrada
                        )
                    )
                    BETWEEN date(?) AND date(?)
            `,
            [
                inicio,
                fim
            ]
        );


    const despesas =
        await get(
            `
                SELECT

                    COALESCE(
                        SUM(valor),
                        0
                    ) AS valor

                FROM despesas

                WHERE
                    date(data)
                    BETWEEN date(?) AND date(?)
            `,
            [
                inicio,
                fim
            ]
        );


    const orcamentos =
        await get(
            `
                SELECT

                    COUNT(*) AS total,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN status = 'Aprovado'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS aprovados

                FROM orcamentos

                WHERE
                    date(data)
                    BETWEEN date(?) AND date(?)
            `,
            [
                inicio,
                fim
            ]
        );


    const faturamento =
        Number(
            pedidos?.faturamento || 0
        );

    const recebido =
        Number(
            pedidos?.recebido || 0
        );

    const pendente =
        Number(
            pedidos?.pendente || 0
        );

    const totalPedidos =
        Number(
            pedidos?.total_pedidos || 0
        );

    const totalDespesas =
        Number(
            despesas?.valor || 0
        );

    const totalOrcamentos =
        Number(
            orcamentos?.total || 0
        );

    const orcamentosAprovados =
        Number(
            orcamentos?.aprovados || 0
        );


    return {

        faturamento,

        recebido,

        pendente,

        despesas:
            totalDespesas,

        resultado:
            recebido -
            totalDespesas,

        resultado_liquido:
            recebido -
            totalDespesas,

        pedidos:
            totalPedidos,

        pedidos_criados:
            totalPedidos,

        pedidos_entregues:
            Number(
                entregues?.total || 0
            ),

        ticket_medio:
            totalPedidos > 0
                ? faturamento /
                  totalPedidos
                : 0,

        orcamentos:
            totalOrcamentos,

        orcamentos_criados:
            totalOrcamentos,

        orcamentos_aprovados:
            orcamentosAprovados,

        taxa_aprovacao:
            totalOrcamentos > 0
                ? (
                    orcamentosAprovados /
                    totalOrcamentos
                ) * 100
                : 0
    };
}


// =====================================================
// AGRUPAMENTO DO GRÁFICO
// =====================================================

function escolherAgrupamentoDesempenho(
    periodo,
    inicio,
    fim
) {

    if (
        periodo === "semanal" ||
        periodo === "mensal"
    ) {
        return "dia";
    }

    if (
        periodo === "semestral" ||
        periodo === "anual"
    ) {
        return "mes";
    }

    const dias =
        diasEntreInclusivo(
            inicio,
            fim
        );

    if (dias <= 45) {
        return "dia";
    }

    if (dias <= 180) {
        return "semana";
    }

    return "mes";
}


function formatarRotuloDiaGrafico(
    data
) {

    const partes =
        String(data).split("-");

    if (
        partes.length !== 3
    ) {
        return String(data);
    }

    return (
        `${partes[2]}/` +
        `${partes[1]}`
    );
}


function formatarRotuloMesGrafico(
    ano,
    mes
) {

    const nomes = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez"
    ];

    return (
        `${nomes[mes]} ` +
        `${ano}`
    );
}


// =====================================================
// DADOS DO GRÁFICO
// =====================================================

async function criarDadosGraficoDesempenho(
    periodo,
    inicio,
    fim
) {

    const agrupamento =
        escolherAgrupamentoDesempenho(
            periodo,
            inicio,
            fim
        );


    const pedidosPagos =
        await all(
            `
                SELECT
                    data_entrada AS data,
                    valor

                FROM pedidos

                WHERE
                    situacao_pagamento = 'Pago'

                    AND

                    date(data_entrada)
                    BETWEEN date(?) AND date(?)

                ORDER BY
                    data_entrada ASC
            `,
            [
                inicio,
                fim
            ]
        );


    const despesas =
        await all(
            `
                SELECT
                    data,
                    valor

                FROM despesas

                WHERE
                    date(data)
                    BETWEEN date(?) AND date(?)

                ORDER BY
                    data ASC
            `,
            [
                inicio,
                fim
            ]
        );


    const grupos = [];


    // =================================================
    // DIA
    // =================================================

    if (
        agrupamento === "dia"
    ) {

        let atual =
            criarDataUTC(
                inicio
            );

        const final =
            criarDataUTC(
                fim
            );


        while (
            atual <= final
        ) {

            const dataTexto =
                converterDataISO(
                    atual
                );

            grupos.push({

                inicio:
                    dataTexto,

                fim:
                    dataTexto,

                label:
                    formatarRotuloDiaGrafico(
                        dataTexto
                    ),

                receitas: 0,

                despesas: 0
            });

            atual =
                adicionarDiasUTC(
                    atual,
                    1
                );
        }
    }


    // =================================================
    // SEMANA
    // =================================================

    else if (
        agrupamento === "semana"
    ) {

        let inicioGrupo =
            criarDataUTC(
                inicio
            );

        const final =
            criarDataUTC(
                fim
            );

        let numeroSemana = 1;


        while (
            inicioGrupo <= final
        ) {

            let fimGrupo =
                adicionarDiasUTC(
                    inicioGrupo,
                    6
                );

            if (
                fimGrupo > final
            ) {

                fimGrupo =
                    new Date(
                        final.getTime()
                    );
            }

            grupos.push({

                inicio:
                    converterDataISO(
                        inicioGrupo
                    ),

                fim:
                    converterDataISO(
                        fimGrupo
                    ),

                label:
                    `Semana ${numeroSemana}`,

                receitas: 0,

                despesas: 0
            });

            inicioGrupo =
                adicionarDiasUTC(
                    fimGrupo,
                    1
                );

            numeroSemana++;
        }
    }


    // =================================================
    // MÊS
    // =================================================

    else {

        const inicioData =
            criarDataUTC(
                inicio
            );

        const fimData =
            criarDataUTC(
                fim
            );

        let ano =
            inicioData.getUTCFullYear();

        let mes =
            inicioData.getUTCMonth();


        while (
            ano < fimData.getUTCFullYear() ||
            (
                ano === fimData.getUTCFullYear() &&
                mes <= fimData.getUTCMonth()
            )
        ) {

            const primeiroDiaMes =
                new Date(
                    Date.UTC(
                        ano,
                        mes,
                        1
                    )
                );

            const ultimoDiaMes =
                new Date(
                    Date.UTC(
                        ano,
                        mes + 1,
                        0
                    )
                );

            const inicioGrupo =
                primeiroDiaMes < inicioData
                    ? inicioData
                    : primeiroDiaMes;

            const fimGrupo =
                ultimoDiaMes > fimData
                    ? fimData
                    : ultimoDiaMes;


            grupos.push({

                inicio:
                    converterDataISO(
                        inicioGrupo
                    ),

                fim:
                    converterDataISO(
                        fimGrupo
                    ),

                label:
                    formatarRotuloMesGrafico(
                        ano,
                        mes
                    ),

                receitas: 0,

                despesas: 0
            });


            mes++;

            if (mes > 11) {

                mes = 0;
                ano++;
            }
        }
    }


    function localizarGrupo(
        data
    ) {

        return grupos.find(
            grupo =>
                data >= grupo.inicio &&
                data <= grupo.fim
        );
    }


    for (
        const pedido
        of pedidosPagos
    ) {

        const data =
            String(
                pedido.data || ""
            ).slice(0, 10);

        const grupo =
            localizarGrupo(
                data
            );

        if (grupo) {

            grupo.receitas +=
                Number(
                    pedido.valor || 0
                );
        }
    }


    for (
        const despesa
        of despesas
    ) {

        const data =
            String(
                despesa.data || ""
            ).slice(0, 10);

        const grupo =
            localizarGrupo(
                data
            );

        if (grupo) {

            grupo.despesas +=
                Number(
                    despesa.valor || 0
                );
        }
    }


    return {

        agrupamento,

        labels:
            grupos.map(
                grupo =>
                    grupo.label
            ),

        receitas:
            grupos.map(
                grupo =>
                    Number(
                        grupo.receitas.toFixed(2)
                    )
            ),

        despesas:
            grupos.map(
                grupo =>
                    Number(
                        grupo.despesas.toFixed(2)
                    )
            ),

        resultado:
            grupos.map(
                grupo =>
                    Number(
                        (
                            grupo.receitas -
                            grupo.despesas
                        ).toFixed(2)
                    )
            )
    };
}


// =====================================================
// ROTA DE DESEMPENHO
// =====================================================

app.get(
    "/api/financeiro/desempenho",
    async (req, res) => {

        try {

            const periodo =
                String(
                    req.query.periodo ||
                    "semanal"
                )
                    .trim()
                    .toLowerCase();


            const periodosPermitidos = [
                "semanal",
                "mensal",
                "semestral",
                "anual",
                "personalizado"
            ];


            if (
                !periodosPermitidos.includes(
                    periodo
                )
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Período inválido. Use semanal, mensal, semestral, anual ou personalizado."
                    });
            }


            let datas;

            try {

                datas =
                    obterPeriodoDesempenho(
                        periodo,
                        req.query.inicio,
                        req.query.fim
                    );

            } catch (erro) {

                return res
                    .status(400)
                    .json({
                        erro:
                            erro.message
                    });
            }


            const [
                atual,
                anterior,
                grafico
            ] =
                await Promise.all([

                    calcularMetricasDesempenho(
                        datas.inicio,
                        datas.fim
                    ),

                    calcularMetricasDesempenho(
                        datas.inicio_anterior,
                        datas.fim_anterior
                    ),

                    criarDadosGraficoDesempenho(
                        periodo,
                        datas.inicio,
                        datas.fim
                    )
                ]);


            res.json({

                periodo: {

                    tipo:
                        periodo,

                    inicio:
                        datas.inicio,

                    fim:
                        datas.fim,

                    inicio_anterior:
                        datas.inicio_anterior,

                    fim_anterior:
                        datas.fim_anterior
                },

                inicio:
                    datas.inicio,

                fim:
                    datas.fim,

                atual,

                anterior,

                grafico
            });


        } catch (erro) {

            console.error(
                "Erro ao carregar desempenho financeiro:",
                erro
            );

            res.status(500).json({

                erro:
                    "Erro ao carregar o desempenho financeiro.",

                detalhe:
                    erro.message
            });
        }
    }
);


// =====================================================
// ROTA 404
// =====================================================

app.use(
    (req, res) => {

        res.status(
            404
        ).json({

            erro:
                "Rota não encontrada.",

            rota:
                req.originalUrl,

            metodo:
                req.method
        });
    }
);


// =====================================================
// INICIAR SERVIDOR
// =====================================================

inicializarBanco()

    .then(
        () => {

            app.listen(
                PORT,
                () => {

                    console.log("");

                    console.log(
                        "================================="
                    );

                    console.log(
                        " SISTEMA DA CONFECÇÃO"
                    );

                    console.log(
                        "================================="
                    );

                    console.log(
                        `Servidor: http://localhost:${PORT}`
                    );

                    console.log(
                        "Banco: SQLite"
                    );

                    console.log(
                        "Log do sistema: ATIVO"
                    );

                    console.log(
                        "================================="
                    );

                    console.log("");
                }
            );
        }
    )

    .catch(
        erro => {

            console.error(
                "Erro ao inicializar banco de dados:",
                erro
            );

            process.exit(
                1
            );
        }
    );