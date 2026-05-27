"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import { FieldLabel, getFieldHelp } from "@/components/dashboard/field-help";
import {
  CurrencyInput,
  currencyDisplayToDecimal,
} from "@/components/ui/currency-input";
import {
  createManualOrderAction,
  type CreateManualOrderResult,
} from "./actions";

type CustomerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  price: string;
  stock: number;
  allowOutOfStock: boolean;
  imageUrl: string | null;
};

type SelectedItem = {
  productId: string;
  quantity: number;
};

type ShippingAddress = {
  shippingZipCode: string;
  shippingStreet: string;
  shippingNumber: string;
  shippingComplement: string;
  shippingNeighborhood: string;
  shippingCity: string;
  shippingState: string;
  recipientName: string;
};

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export function ManualOrderForm({
  customers,
  products,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [shippingFee, setShippingFee] = useState("0,00");
  const [discount, setDiscount] = useState("0,00");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    shippingZipCode: "",
    shippingStreet: "",
    shippingNumber: "",
    shippingComplement: "",
    shippingNeighborhood: "",
    shippingCity: "",
    shippingState: "",
    recipientName: "",
  });
  const [zipStatus, setZipStatus] = useState("");
  const [feedback, setFeedback] = useState<CreateManualOrderResult | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const filteredCustomers = customers.filter((customer) =>
    customerSearch.trim().length >= 3 &&
      `${customer.name} ${customer.email ?? ""} ${customer.phone ?? ""}`
        .toLowerCase()
        .includes(customerSearch.toLowerCase()),
  );
  const filteredProducts = products.filter((product) =>
    productSearch.trim().length >= 3 &&
      product.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      !selectedItems.some((item) => item.productId === product.id),
  );
  const subtotal = selectedItems.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return sum + (product ? Number(product.price) * item.quantity : 0);
  }, 0);
  const shippingFeeAmount = Number(currencyDisplayToDecimal(shippingFee));
  const discountAmount = Number(currencyDisplayToDecimal(discount));
  const total = Math.max(subtotal + shippingFeeAmount - discountAmount, 0);

  function addProduct(productId: string) {
    setSelectedItems((current) => {
      const exists = current.some((item) => item.productId === productId);

      if (exists) {
        return current;
      }

      return [...current, { productId, quantity: 1 }];
    });
    setProductSearch("");
  }

  function removeProduct(productId: string) {
    setSelectedItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
  }

  function updateQuantity(productId: string, quantity: number) {
    setSelectedItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, quantity || 1) }
          : item,
      ),
    );
  }

  function selectCustomer(customer: CustomerOption) {
    setSelectedCustomerId(customer.id);
    setCustomerSearch("");
    setShippingAddress({
      shippingZipCode: customer.zipCode ?? "",
      shippingStreet: customer.street ?? "",
      shippingNumber: customer.number ?? "",
      shippingComplement: customer.complement ?? "",
      shippingNeighborhood: customer.neighborhood ?? "",
      shippingCity: customer.city ?? "",
      shippingState: customer.state ?? "",
      recipientName: customer.name,
    });
  }

  function updateShippingField(field: keyof ShippingAddress, value: string) {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  }

  async function handleZipCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formattedZipCode = digits.replace(/^(\d{5})(\d)/, "$1-$2");

    updateShippingField("shippingZipCode", formattedZipCode);

    if (digits.length < 8) {
      setZipStatus("");
      return;
    }

    setZipStatus("Buscando endereço...");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await response.json()) as ViaCepResponse;

      if (!response.ok || data.erro) {
        setZipStatus("CEP não encontrado.");
        return;
      }

      setShippingAddress((current) => ({
        ...current,
        shippingZipCode: data.cep ?? formattedZipCode,
        shippingStreet: data.logradouro ?? current.shippingStreet,
        shippingComplement: data.complemento || current.shippingComplement,
        shippingNeighborhood: data.bairro ?? current.shippingNeighborhood,
        shippingCity: data.localidade ?? current.shippingCity,
        shippingState: data.uf ?? current.shippingState,
      }));
      setZipStatus("Endereço preenchido automaticamente.");
    } catch {
      setZipStatus("Não foi possível buscar o CEP agora.");
    }
  }

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    formData.set("customerId", selectedCustomerId);
    formData.set("items", JSON.stringify(selectedItems));
    setPendingFormData(formData);
    setShowConfirm(true);
  }

  function confirmCreateOrder() {
    if (!pendingFormData) {
      return;
    }

    setShowConfirm(false);

    startTransition(() => {
      void createManualOrderAction(pendingFormData).then((result) => {
        setFeedback(result);

        if (result.type === "success") {
          setSelectedItems([]);
          setPendingFormData(null);
        }
      });
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">1. Cliente</h2>
          <p className="text-sm text-slate-500">
            Escolha quem será responsável pelo pedido manual.
          </p>
        </header>
        <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <FieldLabel help="Busque por nome, e-mail ou telefone do cliente.">
              Buscar cliente
            </FieldLabel>
            <div className="relative">
              <input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Digite pelo menos 3 letras"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#17293f]"
              />
              {customerSearch.trim().length >= 3 ? (
                <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-50"
                      >
                        <span>
                          <strong className="block text-slate-800">
                            {customer.name}
                          </strong>
                          <small className="text-xs text-slate-500">
                            {customer.email ?? customer.phone ?? "Sem contato"}
                          </small>
                        </span>
                        <span className="text-xs font-black text-[#17293f]">
                          Selecionar
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-sm font-semibold text-slate-400">
                      Nenhum cliente encontrado.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-black text-slate-700">Cliente selecionado</p>
            {selectedCustomer ? (
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <strong className="text-xl text-slate-950">{selectedCustomer.name}</strong>
                <span>{selectedCustomer.email ?? "Sem e-mail"}</span>
                <span>{selectedCustomer.phone ?? "Sem telefone"}</span>
                <span>
                  {[selectedCustomer.street, selectedCustomer.number, selectedCustomer.city, selectedCustomer.state]
                    .filter(Boolean)
                    .join(", ") || "Endereço não informado"}
                </span>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Selecione um cliente na listagem ao lado para liberar o pedido.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">2. Produtos</h2>
          <p className="text-sm text-slate-500">
            Digite o produto, selecione na lista e ajuste a quantidade.
          </p>
        </header>
        <div className="p-5">
          <FieldLabel help="Busque produtos cadastrados nesta loja para adicionar ao pedido.">
            Buscar produto
          </FieldLabel>
          <div className="relative">
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Digite pelo menos 3 letras do produto"
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#17293f]"
            />
            {productSearch.trim().length >= 3 ? (
              <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product.id)}
                      className="grid w-full grid-cols-[1fr_120px_120px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-50"
                    >
                      <strong className="text-slate-800">{product.name}</strong>
                      <span className="text-slate-500">
                        Estoque: {product.allowOutOfStock ? "sem limite" : product.stock}
                      </span>
                      <span className="font-black text-slate-950">
                        {formatCurrency(Number(product.price))}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-sm font-semibold text-slate-400">
                    Nenhum produto encontrado.
                  </div>
                )}
              </div>
            ) : null}
            </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1fr_120px_120px_120px_90px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-500">
              <span>Produto</span>
              <span>Quantidade</span>
              <span>Estoque</span>
              <span>Preço</span>
              <span />
            </div>
            {selectedItems.map((item) => {
              const product = productMap.get(item.productId);

              if (!product) return null;
              return (
                <div
                  key={product.id}
                  className="grid grid-cols-[1fr_120px_120px_120px_90px] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm"
                >
                  <div>
                    <strong className="block text-slate-800">{product.name}</strong>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateQuantity(product.id, Number(event.target.value))
                    }
                    className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-slate-900"
                  />
                  <span className="text-slate-600">
                    {product.allowOutOfStock ? "Sem limite" : product.stock}
                  </span>
                  <span>
                    <strong className="block font-black text-slate-950">
                      {formatCurrency(Number(product.price) * item.quantity)}
                    </strong>
                    <small className="text-xs font-semibold text-slate-400">
                      {formatCurrency(Number(product.price))} un.
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProduct(product.id)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                  >
                    Remover
                  </button>
                </div>
              );
            })}
            {selectedItems.length === 0 ? (
              <div className="border-t border-slate-100 p-5 text-center text-sm font-semibold text-slate-400">
                Nenhum produto adicionado ao pedido.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">3. Entrega</h2>
            <p className="text-sm text-slate-500">
              Informe endereço, frete e rastreio quando houver.
            </p>
          </header>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field
              name="shippingZipCode"
              label="CEP"
              value={shippingAddress.shippingZipCode}
              onChange={(value) => void handleZipCodeChange(value)}
              hint={zipStatus}
            />
            <Field
              name="shippingStreet"
              label="Rua"
              value={shippingAddress.shippingStreet}
              onChange={(value) => updateShippingField("shippingStreet", value)}
            />
            <Field
              name="shippingNumber"
              label="Número"
              value={shippingAddress.shippingNumber}
              onChange={(value) => updateShippingField("shippingNumber", value)}
            />
            <Field
              name="shippingComplement"
              label="Complemento"
              value={shippingAddress.shippingComplement}
              onChange={(value) => updateShippingField("shippingComplement", value)}
            />
            <Field
              name="shippingNeighborhood"
              label="Bairro"
              value={shippingAddress.shippingNeighborhood}
              onChange={(value) => updateShippingField("shippingNeighborhood", value)}
            />
            <Field
              name="shippingCity"
              label="Cidade"
              value={shippingAddress.shippingCity}
              onChange={(value) => updateShippingField("shippingCity", value)}
            />
            <Field
              name="shippingState"
              label="Estado"
              value={shippingAddress.shippingState}
              onChange={(value) => updateShippingField("shippingState", value)}
            />
            <Field
              name="recipientName"
              label="Nome destinatário"
              value={shippingAddress.recipientName}
              onChange={(value) => updateShippingField("recipientName", value)}
            />
            <Field name="shippingMethod" label="Método de envio" placeholder="Ex: Correios, motoboy, retirada" />
            <Field name="trackingCode" label="Código de rastreio" />
            <Field name="shippingDeadline" label="Prazo de envio" placeholder="Ex: 5 dias úteis" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">4. Pagamento e resumo</h2>
            <p className="text-sm text-slate-500">
              Defina pagamento, valores extras e confirme o total.
            </p>
          </header>
          <div className="grid gap-4 p-5">
            <Select
              name="status"
              label="Situação do pedido"
              options={[
                ["PENDING", "Pendente"],
                ["PAID", "Pago"],
                ["PROCESSING", "Processando"],
              ]}
            />
            <Select
              name="paymentMethod"
              label="Forma de pagamento"
              options={[
                ["", "Selecione"],
                ["pix", "Pix"],
                ["cartao", "Cartão"],
                ["boleto", "Boleto"],
                ["dinheiro", "Dinheiro"],
                ["manual", "Pagamento manual"],
              ]}
            />
            <Select
              name="paymentStatus"
              label="Status do pagamento"
              options={[
                ["pendente", "Pendente"],
                ["pago", "Pago"],
                ["aguardando", "Aguardando confirmação"],
              ]}
            />
            <MoneyField
              name="shippingFee"
              label="Valor do Frete (R$)"
              value={shippingFee}
              onChange={setShippingFee}
            />
            <MoneyField
              name="discount"
              label="Desconto (R$)"
              value={discount}
              onChange={setDiscount}
            />
            <label>
              <FieldLabel help={getFieldHelp("notes", "Observações")}>
                Observações
              </FieldLabel>
              <textarea
                name="notes"
                rows={4}
                placeholder="Observações internas sobre este pedido"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#17293f]"
              />
            </label>

            <div className="rounded-2xl bg-slate-50 p-5 text-sm">
              <Line label="Subtotal" value={formatCurrency(subtotal)} />
              <Line label="Frete" value={formatCurrency(shippingFeeAmount)} />
              <Line label="Desconto" value={`-${formatCurrency(discountAmount)}`} />
              <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-black text-slate-950">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600"
        >
          Cancelar
        </Link>
        <button
          disabled={isPending || !selectedCustomerId || selectedItems.length === 0}
          className="rounded-xl bg-[#17293f] px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Criando pedido..." : "✓ Adicionar Pedido"}
        </button>
      </div>

      {showConfirm ? (
        <ConfirmOrderModal
          customerName={selectedCustomer?.name ?? "Cliente"}
          itemsCount={selectedItems.length}
          total={formatCurrency(total)}
          isPending={isPending}
          onClose={() => setShowConfirm(false)}
          onConfirm={confirmCreateOrder}
        />
      ) : null}

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Pedido criado com sucesso!"
          errorTitle="Não foi possível criar o pedido"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </form>
  );
}

function ConfirmOrderModal({
  customerName,
  itemsCount,
  total,
  isPending,
  onClose,
  onConfirm,
}: {
  customerName: string;
  itemsCount: number;
  total: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-2xl">
          ✓
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">
          Criar pedido manual?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Confirme para criar o pedido de <strong>{customerName}</strong> com{" "}
          <strong>{itemsCount}</strong> produto(s), totalizando{" "}
          <strong>{total}</strong>.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:opacity-60"
          >
            {isPending ? "Criando..." : "Sim, criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  value,
  onChange,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  hint?: string;
}) {
  return (
    <label>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <input
        name={name}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        defaultValue={value === undefined ? defaultValue : undefined}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#17293f]"
      />
      {hint ? (
        <span className="mt-2 block text-xs font-semibold text-[#17293f]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function MoneyField({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <CurrencyInput
        name={name}
        value={value}
        onValueChange={(_decimalValue, formattedValue) => onChange(formattedValue)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#17293f]"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: Array<[string, string]>;
}) {
  return (
    <label>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <select
        name={name}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#17293f]"
      >
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-slate-600">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
