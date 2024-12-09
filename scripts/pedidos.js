const URL_CLIENTES = 'http://localhost:8080/api/clientes'
const URL_PEDIDOS  = 'http://localhost:8080/api/pedidos'
const INSERT_STATE = 0
const EDIT_STATE   = 1

const status = {
    "PROCESSAMENTO": "Em Processamento",
    "ENVIADO": "Pedido Enviado",
    "ENTREGUE": "Pedido Entregue",
    "CANCELADO": "Pedido Cancelado"
}

$(document).ready(() => {
    let clientes = []  // Armazena clientes e seus pedidos após FetchRegistros()

    // Busca todos os clientes e seus pedidos para montar a grid
    function FetchRegistros() {
    fetch(URL_CLIENTES)
        .then((res) => res.json())
        .then((dados) => {
        clientes = dados;
        GerarGrid();
        })
        .catch(console.error)
    }

    // Gera a tabela de pedidos a partir da lista de clientes
    function GerarGrid() {
    let tableBody = $('#orders-table'); // Ajustado para orders-table
    tableBody.empty();

    clientes.forEach(cliente => {
        cliente.listaPedidos.forEach(pedido => {
        tableBody.append(`
            <tr>
            <td>${pedido.descricaoPedido}</td>
            <td>R$ ${parseFloat(pedido.valorTotal).toFixed(2)}</td>
            <td>${status[pedido.statusPedido]}</td>
            <td>${cliente.nomeCompleto}</td>
            <td>
                <button type="button" class="btn btn-outline-primary btn-sm edit" data-id="${pedido.idPedido}" data-bs-toggle="modal" data-bs-target="#pedido-modal">
                <i class="bi bi-pen"></i>
                </button>
                <button type="button" class="btn btn-outline-primary btn-sm delete" data-id="${pedido.idPedido}" data-bs-toggle="modal" data-bs-target="#confirm-delete">
                <i class="bi bi-trash"></i>
                </button>
            </td>
            </tr>
        `);
        });
    });
    }

    // Carrega os clientes no select, sempre buscando do servidor
    function LoadClientes(selectedClienteId = null) {
    fetch(URL_CLIENTES)
        .then(res => res.json())
        .then(clientes => {
        let clienteSelect = $('#pedido-cliente')
        clienteSelect.empty()
        clienteSelect.append('<option value="">Selecione um cliente</option>')
        clientes.forEach(cliente => {
            let selected = cliente.idCliente == selectedClienteId ? 'selected' : ''
            clienteSelect.append(`
            <option value="${cliente.idCliente}" ${selected}>
                ${cliente.nomeCompleto} - <small>${cliente.cpfCnpj}</small>
            </option>
            `)
        })
        })
        .catch(console.error)
    }

    // Máscara para o valor do pedido
    $('#pedido-valor').on('input', function() {
    let value = $(this).val()
    value = value.replace(/\D/g, '')
    value = (value / 100).toFixed(2) + ''
    value = value.replace('.', ',')
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
    $(this).val(value)
    })

    // Ao clicar em adicionar pedido
    $('#add-pedido').on('click', () => {
    $('#pedido-descricao').val('')
    $('#pedido-valor').val('')
    $('#pedido-status').val('')
    $('#pedido-cliente').val('')

    $('#pedido-modal-label').text('Inserir Pedido')

    $('#pedido-form').removeAttr('data-id')
    $('#pedido-form').attr('data-state', INSERT_STATE)

    LoadClientes()
    })

    // Supondo que já temos a variável 'clientes' preenchida pelo FetchRegistros

    $(document).on('click', '.edit', function() {
        let pedidoId = $(this).data("id");
    
        fetch(`${URL_PEDIDOS}/${pedidoId}`)
        .then(res => res.json())
        .then(pedido => {
            // Preenche os campos do modal
            $('#pedido-descricao').val(pedido.descricaoPedido)
            $('#pedido-valor').val(pedido.valorTotal.toFixed(2).replace('.', ','))
            $('#pedido-status').val(pedido.statusPedido)
    
            $('#pedido-modal-label').text('Editar Pedido')
    
            $('#pedido-form').attr('data-id', pedidoId)
            $('#pedido-form').attr('data-state', EDIT_STATE)
    
            // Como a rota de pedido não retorna cliente, precisamos localizar o cliente do pedido
            let clienteIdDoPedido = null;
            
            // Percorre a lista de clientes e verifica qual possui o pedido com o ID atual
            for (let cliente of clientes) {
            let pedidoEncontrado = cliente.listaPedidos.find(ped => ped.idPedido === pedidoId);
            if (pedidoEncontrado) {
                clienteIdDoPedido = cliente.idCliente; // A propriedade idCliente vem da rota clientes
                break;
            }
            }
    
            // Agora chamamos LoadClientes com o clienteIdDoPedido encontrado
            LoadClientes(clienteIdDoPedido)
        })
        .catch(console.error)
    });
    
// Ao salvar o pedido (inserir ou editar)
    $('#save-pedido').on('click', () => {
        let id = ""
        let descricao = $('#pedido-descricao').val().trim()
        let valor = $('#pedido-valor').val().trim()
        let statusPedido = $('#pedido-status').val()
        let clienteId = $('#pedido-cliente').val()

        if (!descricao || !valor || !statusPedido || !clienteId) {
            alert('Por favor, preencha todos os campos obrigatórios.')
            return
        }

        valor = valor.replace(/\./g, '').replace(',', '.')

        let state  = $('#pedido-form').attr('data-state')
        let url    = URL_PEDIDOS
        let method = 'POST'

        if (state == EDIT_STATE) {
            id = $('#pedido-form').attr('data-id')
            method = 'PUT'
            url = `${URL_PEDIDOS}/${id}` // Ajuste aqui para enviar o ID na URL
        }

        $.ajax({
            url: url,
            method: method,
            contentType: 'application/json', 
            data: JSON.stringify({
                idPedido: id, // Você pode manter esta linha para coerência, já que o backend seta este ID, mas o importante é passar na URL
                descricaoPedido: descricao,
                valorTotal: parseFloat(valor),
                statusPedido: statusPedido,
                cliente: { idCliente: parseInt(clienteId) }
            }),
            success: () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('pedido-modal'))
                modal.hide()
                FetchRegistros()
            },
            error: (xhr) => {
                let errorMessage = 'Erro ao Salvar Pedido'
                if (xhr.responseText) {
                    errorMessage += ': ' + xhr.responseText
                }
                alert(errorMessage)
            }
        })
    })

    // Ao clicar em deletar
    $(document).on('click', '.delete', function() {
    let pedidoId = $(this).data("id")
    $('#confirm-delete').attr('data-id', pedidoId)
    })

    // Confirmar exclusão
    $('#yes-delete').on('click', function() {
    let pedidoId = $('#confirm-delete').attr('data-id')

    $.ajax({
        url: `${URL_PEDIDOS}/${pedidoId}`,
        method: 'DELETE',
        success: () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirm-delete'))
        modal.hide()
        FetchRegistros()
        },
        error: (xhr) => {
        let errorMessage = 'Erro ao Deletar Pedido'
        if (xhr.responseText) {
            errorMessage += ': ' + xhr.responseText
        }
        alert(errorMessage)
        }
    })
    })

    // Inicializa a tela
    FetchRegistros()
})
