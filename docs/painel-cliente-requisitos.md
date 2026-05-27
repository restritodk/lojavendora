# Painel do Cliente - Requisitos Pendentes

## Configuracoes > Dominio

Esta funcionalidade ainda nao esta implementada. Quando o painel do cliente/lojista for desenvolvido, deve existir uma area:

```txt
Dashboard do lojista > Configuracoes > Dominio
```

### Regra principal

Todos os clientes usam subdominio por padrao:

```txt
cliente.lojavendora.com.br
```

O cliente pode opcionalmente configurar dominio proprio:

```txt
www.dominiodocliente.com.br
```

### Regra comercial

Para liberar dominio proprio, cobrar taxa unica:

```txt
R$ 79,90
```

O dominio proprio so deve ser ativado quando:

- O pagamento da taxa estiver confirmado.
- O DNS do cliente estiver apontando corretamente.

### Fluxo esperado

1. Cliente acessa `Configuracoes > Dominio`.
2. Sistema mostra o subdominio atual da loja.
3. Cliente escolhe entre:
   - Usar subdominio padrao.
   - Conectar dominio proprio.
4. Cliente informa o dominio proprio.
5. Sistema mostra instrucoes de DNS.
6. Cliente configura o DNS no provedor onde comprou o dominio.
7. Sistema verifica o DNS.
8. Sistema cobra/confirma a taxa de R$ 79,90.
9. Dominio proprio fica ativo.

### DNS recomendado

Para usar `www`:

```txt
Tipo: CNAME
Nome: www
Valor: cname.lojavendora.com.br
```

Para dominio raiz, preferir orientar o cliente a redirecionar para `www`, pois alguns provedores nao oferecem ALIAS/ANAME.

### Campos sugeridos no banco

Adicionar no model `Store` ou em um novo model dedicado:

```txt
customDomain
customDomainStatus
customDomainVerifiedAt
customDomainActivationPaid
customDomainActivationPaidAt
```

Status sugeridos:

```txt
PENDING
VERIFYING
ACTIVE
FAILED
```

### Infraestrutura planejada

- VPS na Contabo.
- Dominio principal comprado na HostGator.
- Recomendado usar Cloudflare para DNS, wildcard, SSL e estabilidade.
- Configurar wildcard para subdominios:

```txt
*.lojavendora.com.br
```

