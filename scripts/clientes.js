const URL_CLIENTES = 'http://localhost:8080/api/clientes';
const INSERT_STATE = 0;
const EDIT_STATE = 1;

let clientes = [];
$(document).ready(() => {
    // Função para buscar clientes
    function FetchRegistros() {
        fetch(URL_CLIENTES)
            .then(res => res.json())
            .then(dados => {
                clientes = dados;
                GerarGrid(clientes);
            })
            .catch(console.error);
    }

    // Função para gerar a tabela de clientes
    function GerarGrid(dados) {
        let tableBody = $('#clients-table');
        tableBody.empty();

        dados.forEach(dado => {
            tableBody.append(`
                <tr>
                    <td>${dado.nomeCompleto}</td>
                    <td>${dado.cpfCnpj}</td>
                    <td>${dado.numeroTelefone}</td>
                    <td>${dado.endereco}</td>
                    <td>
                        <!-- Assim como em pedidos, usamos data-bs-toggle direto no botão -->
                        <button type="button" class="btn btn-outline-primary btn-sm edit" data-id="${dado.idCliente}" data-state="1" data-bs-toggle="modal" data-bs-target="#cliente-modal">
                            <i class="bi bi-pen"></i>
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm delete" data-id="${dado.idCliente}" data-bs-toggle="modal" data-bs-target="#confirm-delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>    
            `);
        });
    }

    // Ao clicar em adicionar cliente
    // Agora não chamamos modal.show() manualmente, o modal abre pelo data-bs-toggle no botão #add-client
    $('#add-client').on('click', () => {
        // Limpar os campos do modal
        $('#cliente-nome').val('');
        $('#cliente-cpf').val('');
        $('#cliente-telefone').val('');
        $('#cliente-endereco').val('');

        // Definir título do modal
        $('#cliente-modal-label').text('Inserir Cliente');

        // Configurar o estado para inserção
        $('#cliente-form').removeAttr('data-id');
        $('#cliente-form').attr('data-state', INSERT_STATE);
    });

    // Ao clicar em editar cliente
    $(document).on('click', '.edit', function() {
        let clienteId = $(this).data("id");

        fetch(`${URL_CLIENTES}/${clienteId}`)
            .then(res => res.json())
            .then(cliente => {
                $('#cliente-nome').val(cliente.nomeCompleto);
                $('#cliente-cpf').val(cliente.cpfCnpj);
                $('#cliente-telefone').val(cliente.numeroTelefone);
                $('#cliente-endereco').val(cliente.endereco);

                $('#cliente-modal-label').text('Editar Cliente');

                $('#cliente-form').attr('data-id', clienteId);
                $('#cliente-form').attr('data-state', EDIT_STATE);
            })
            .catch(console.error);
    });

    // Salvar cliente (novo ou editado)
    $('#save-cliente').on('click', () => {
        let nome = $('#cliente-nome').val().trim();
        let cpf = $('#cliente-cpf').val().trim();
        let telefone = $('#cliente-telefone').val().trim();
        let endereco = $('#cliente-endereco').val().trim();
        let id = "";

        // Verificar se os campos obrigatórios estão preenchidos
        if (!nome || !cpf || !telefone) {
            alert('Por favor, preencha os campos obrigatórios: Nome, CPF e Telefone.');
            return;
        }

        let state = $('#cliente-form').attr('data-state');
        let url = URL_CLIENTES;
        let method = 'POST';

        if (state == EDIT_STATE) {
            id = $('#cliente-form').attr('data-id');
            method = 'PUT';
            url = `${URL_CLIENTES}/${id}`; // ID na URL para o PUT
        }

        $.ajax({
            url: url,
            method: method,
            contentType: 'application/json',
            data: JSON.stringify({
                idCliente: id,
                nomeCompleto: nome,
                cpfCnpj: cpf,
                numeroTelefone: telefone,
                endereco: endereco,
                listaPedidos: []
            }),
            success: () => {
                // O modal será fechado automaticamente pois tem data-bs-dismiss no botão "Fechar"
                // ou podemos fechar manualmente pegando a instância se quisermos:
                const clienteModalEl = document.getElementById('cliente-modal');
                const modalInstance = bootstrap.Modal.getInstance(clienteModalEl);
                modalInstance.hide();

                FetchRegistros();
            },
            error: (xhr) => {
                let errorMessage = 'Erro ao Salvar Cliente';
                if (xhr.responseText) {
                    errorMessage += ': ' + xhr.responseText;
                }
                alert(errorMessage);
            }
        });
    });

    // Ao clicar em deletar
    $(document).on('click', '.delete', function() {
        let clienteId = $(this).data("id");
        $('#confirm-delete').attr('data-id', clienteId);
    });

    // Confirmar exclusão
    $('#yes-delete').on('click', function() {
        let clienteId = $('#confirm-delete').attr('data-id');

        $.ajax({
            url: `${URL_CLIENTES}/${clienteId}`,
            method: 'DELETE',
            success: () => {
                const confirmDeleteEl = document.getElementById('confirm-delete');
                const modalInstance = bootstrap.Modal.getInstance(confirmDeleteEl);
                modalInstance.hide();

                FetchRegistros();
            },
            error: (xhr) => {
                let errorMessage = 'Erro ao Deletar Cliente';
                if (xhr.responseText) {
                    errorMessage += ': ' + xhr.responseText;
                }
                alert(errorMessage);
            }
        });
    });

    $('#search-type').on('change', function() {
        $('#search-input').val('');
        FiltrarClientes();
    })
    
    $('#search-input').on('input', function() {
        FiltrarClientes();
    })
    
    function FiltrarClientes() {
        let searchType = $('#search-type').val();
        let searchTerm = $('#search-input').val().trim().toLowerCase();
    
        if (searchTerm === '') {
            GerarGrid(clientes);
        } else {
            let filteredClientes = clientes.filter(cliente => {
                if (searchType === 'nome') {
                    // Pesquisar por nomeCompleto (minúsculo)
                    return cliente.nomeCompleto.toLowerCase().includes(searchTerm);
                } else if (searchType === 'cpf') {
                    // Remove caracteres não numéricos do CPF/CNPJ do cliente e do termo pesquisado
                    let clienteCpf = cliente.cpfCnpj.replace(/[^\d]/g, '');
                    let searchCpf = searchTerm.replace(/[^\d]/g, '');
                    return clienteCpf.includes(searchCpf);
                }
                return false;
            });
            GerarGrid(filteredClientes);
        }
    }

    // Inicializar a listagem de clientes
    FetchRegistros();
});
