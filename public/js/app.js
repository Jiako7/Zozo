// ==========================================
// FORMATAÇÃO DE MOEDA
// ==========================================

function formatarMoedaInput(valor) {

    const numeros =
        String(valor || "")
            .replace(/\D/g, "");


    if (!numeros) {
        return "";
    }


    const numero =
        Number(numeros) / 100;


    return numero.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function moedaParaNumero(valor) {

    if (!valor) {
        return 0;
    }


    return Number(
        String(valor)
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
    );
}


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
// FORMATAÇÃO DE TELEFONE
// ==========================================

function formatarTelefone(valor) {

    const numeros =
        String(valor || "")
            .replace(/\D/g, "")
            .slice(0, 11);


    if (!numeros) {
        return "";
    }


    if (numeros.length <= 2) {

        return `(${numeros}`;
    }


    if (numeros.length <= 6) {

        return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }


    if (numeros.length <= 10) {

        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }


    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}