"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import type { StoreRegistrationValues } from "@/lib/store-registration";
import { saveStoreRegistrationAction, type StoreRegistrationResult } from "./actions";

type StoreRegistrationFormProps = {
  userEmail: string;
  store: {
    name: string;
    logoUrl: string | null;
  };
  values: StoreRegistrationValues;
  businessSegments: string[];
};

type AddressValues = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

export function StoreRegistrationForm({
  userEmail,
  store,
  values,
  businessSegments,
}: StoreRegistrationFormProps) {
  const registrationEmail = userEmail ?? "";
  const [personType, setPersonType] = useState(values.personType === "JURIDICA" ? "JURIDICA" : "FISICA");
  const [documentValue, setDocumentValue] = useState(
    maskDocument(values.document ?? "", values.personType === "JURIDICA" ? "JURIDICA" : "FISICA"),
  );
  const [phoneValue, setPhoneValue] = useState(maskPhone(values.phone ?? ""));
  const [secondaryPhoneValue, setSecondaryPhoneValue] = useState(maskPhone(values.secondaryPhone ?? ""));
  const [whatsappValue, setWhatsappValue] = useState(maskPhone(values.whatsapp ?? ""));
  const [zipCodeValue, setZipCodeValue] = useState(values.zipCode ?? "");
  const [streetValue, setStreetValue] = useState(values.street ?? "");
  const [numberValue, setNumberValue] = useState(values.number ?? "");
  const [complementValue, setComplementValue] = useState(values.complement ?? "");
  const [neighborhoodValue, setNeighborhoodValue] = useState(values.neighborhood ?? "");
  const [stateValue, setStateValue] = useState(values.state ?? "");
  const [cityValue, setCityValue] = useState(values.city ?? "");
  const [physicalAddressValue, setPhysicalAddressValue] = useState(
    values.physicalAddress || buildPhysicalAddress({
      street: values.street,
      number: values.number,
      complement: values.complement,
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state,
      zipCode: values.zipCode,
    }),
  );
  const [isPhysicalAddressEdited, setIsPhysicalAddressEdited] = useState(Boolean(values.physicalAddress));
  const [logoPreview, setLogoPreview] = useState(values.logoUrl || store.logoUrl || "");
  const [segmentQuery, setSegmentQuery] = useState(values.businessSegment ?? "");
  const [isSegmentOpen, setIsSegmentOpen] = useState(false);
  const [feedback, setFeedback] = useState<StoreRegistrationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const filteredSegments = useMemo(() => {
    const normalized = normalizeSearch(segmentQuery);
    return businessSegments.filter((segment) => normalizeSearch(segment).includes(normalized));
  }, [businessSegments, segmentQuery]);

  function submit(formData: FormData) {
    setFeedback(null);
    startTransition(() => {
      void saveStoreRegistrationAction(formData).then(setFeedback);
    });
  }

  function syncPhysicalAddress(nextValues: Partial<AddressValues>) {
    if (isPhysicalAddressEdited) {
      return;
    }

    setPhysicalAddressValue(buildPhysicalAddress({
      street: streetValue,
      number: numberValue,
      complement: complementValue,
      neighborhood: neighborhoodValue,
      city: cityValue,
      state: stateValue,
      zipCode: zipCodeValue,
      ...nextValues,
    }));
  }

  async function fillAddressByCep(cep: string) {
    const cleanCep = cep.replace(/\D/g, "");
    setZipCodeValue(cleanCep);
    syncPhysicalAddress({ zipCode: cleanCep });

    if (cleanCep.length !== 8) {
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json() as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (data.erro) {
        return;
      }

      const nextAddress = {
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
        zipCode: cleanCep,
      };

      setStreetValue(nextAddress.street);
      setNeighborhoodValue(nextAddress.neighborhood);
      setCityValue(nextAddress.city);
      setStateValue(nextAddress.state);
      syncPhysicalAddress(nextAddress);
    } catch {
      // Autocomplete is a convenience; manual typing remains available.
    }
  }

  return (
    <form action={submit} className="grid gap-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
          <h1 className="font-black text-slate-900">Dados cadastrais</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mantenha os dados do lojista, identidade da loja e canais de contato atualizados.
          </p>
        </header>
        <div className="border-l-4 border-cyan-500 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          Essas informações são isoladas por loja e algumas aparecem na página de contato do site.
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader title="Informações principais" />
        <div className="grid gap-5 p-5">
          <div className="grid gap-2">
            <FieldLabel label="Tipo de pessoa" />
            <div className="flex gap-5">
              {[
                { id: "FISICA", label: "Física" },
                { id: "JURIDICA", label: "Jurídica" },
              ].map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="radio"
                    name="personType"
                    value={option.id}
                    checked={personType === option.id}
                    onChange={() => {
                      setPersonType(option.id);
                      setDocumentValue(maskDocument(documentValue, option.id));
                    }}
                    className="size-4 accent-cyan-700"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {personType === "FISICA" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Input name="fullName" label="Nome completo" defaultValue={values.fullName} required className="md:col-span-2" />
              <Input name="email" label="E-mail de cadastro" value={registrationEmail} readOnly />
              <Input
                name="document"
                label="CPF"
                value={documentValue}
                onChange={(event) => setDocumentValue(maskDocument(event.target.value, "FISICA"))}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
              <Input name="stateRegistration" label="RG" defaultValue={values.stateRegistration} placeholder="Ex: SP 00.000.000" />
              <Input
                name="phone"
                label="Telefone de contato"
                value={phoneValue}
                onChange={(event) => setPhoneValue(maskPhone(event.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <Input name="companyName" label="Razão Social" defaultValue={values.companyName} required className="md:col-span-2" />
              <Input name="representative" label="Representante" defaultValue={values.representative} required />
              <Input name="email" label="E-mail de cadastro" value={registrationEmail} readOnly />
              <Input
                name="document"
                label="CNPJ"
                value={documentValue}
                onChange={(event) => setDocumentValue(maskDocument(event.target.value, "JURIDICA"))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                required
              />
              <Input name="stateRegistration" label="Inscrição estadual" defaultValue={values.stateRegistration} />
              <Input
                name="phone"
                label="Telefone de contato"
                value={phoneValue}
                onChange={(event) => setPhoneValue(maskPhone(event.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
              <Input
                name="secondaryPhone"
                label="Telefone de contato"
                value={secondaryPhoneValue}
                onChange={(event) => setSecondaryPhoneValue(maskPhone(event.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <Input
              name="zipCode"
              label="CEP"
              value={zipCodeValue}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, "").slice(0, 8);
                setZipCodeValue(value);
                syncPhysicalAddress({ zipCode: value });
              }}
              onBlur={(event) => fillAddressByCep(event.currentTarget.value)}
              required
            />
            <Input
              name="street"
              label="Endereço"
              value={streetValue}
              onChange={(event) => {
                setStreetValue(event.target.value);
                syncPhysicalAddress({ street: event.target.value });
              }}
              required
              className="md:col-span-2"
            />
            <Input
              name="number"
              label="Número"
              value={numberValue}
              onChange={(event) => {
                setNumberValue(event.target.value);
                syncPhysicalAddress({ number: event.target.value });
              }}
              required
            />
            <Input
              name="complement"
              label="Complemento"
              value={complementValue}
              onChange={(event) => {
                setComplementValue(event.target.value);
                syncPhysicalAddress({ complement: event.target.value });
              }}
            />
            <Input
              name="neighborhood"
              label="Bairro"
              value={neighborhoodValue}
              onChange={(event) => {
                setNeighborhoodValue(event.target.value);
                syncPhysicalAddress({ neighborhood: event.target.value });
              }}
              required
            />
            <Input
              name="state"
              label="Estado"
              value={stateValue}
              onChange={(event) => {
                setStateValue(event.target.value);
                syncPhysicalAddress({ state: event.target.value });
              }}
              required
            />
            <Input
              name="city"
              label="Cidade"
              value={cityValue}
              onChange={(event) => {
                setCityValue(event.target.value);
                syncPhysicalAddress({ city: event.target.value });
              }}
              required
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader title="Campos informativos da loja" />
        <div className="grid gap-5 p-5 lg:grid-cols-[220px_1fr]">
          <div className="grid content-start gap-3">
            <FieldLabel label="Logotipo publicitário" />
            <div className="grid min-h-40 place-items-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {logoPreview ? (
                <Image src={logoPreview} alt={store.name} width={160} height={120} unoptimized className="max-h-32 w-auto object-contain" />
              ) : (
                <span className="text-sm font-semibold text-slate-400">Sem logo</span>
              )}
            </div>
            <input type="hidden" name="logoUrl" value={logoPreview} />
            <label className="cursor-pointer rounded-xl bg-cyan-700 px-4 py-3 text-center text-sm font-black text-white">
              Escolher imagem
              <input
                name="logoFile"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setLogoPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                name="phone"
                label="Telefone de contato"
                value={phoneValue}
                onChange={(event) => setPhoneValue(maskPhone(event.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
              <Input
                name="whatsapp"
                label="Whatsapp"
                value={whatsappValue}
                onChange={(event) => setWhatsappValue(maskPhone(event.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
              <Input name="serviceHours" label="Horário de atendimento" defaultValue={values.serviceHours} placeholder="De Segunda à Sexta das 9:00 às 18:00" />
              <Input name="contactEmail" label="E-mail de contato" defaultValue={values.contactEmail} placeholder="contato@seudominio.com.br" />
            </div>
            <Input
              name="physicalAddress"
              label="Endereço físico da loja"
              value={physicalAddressValue}
              onChange={(event) => {
                setPhysicalAddressValue(event.target.value);
                setIsPhysicalAddressEdited(true);
              }}
              placeholder="Seu endereço completo, número - bairro - cidade - estado - CEP"
            />
            <div className="relative grid gap-2">
              <FieldLabel label="Ramo de atividade da loja" />
              <input
                name="businessSegment"
                value={segmentQuery}
                onChange={(event) => {
                  setSegmentQuery(event.target.value);
                  setIsSegmentOpen(true);
                }}
                onFocus={() => setIsSegmentOpen(true)}
                className="h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-cyan-500"
              />
              {isSegmentOpen ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                  {filteredSegments.map((segment) => (
                    <button
                      key={segment}
                      type="button"
                      onClick={() => {
                        setSegmentQuery(segment);
                        setIsSegmentOpen(false);
                      }}
                      className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                    >
                      {segment}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="facebookUrl" label="Link do Facebook" defaultValue={values.facebookUrl} />
              <Input name="twitterUrl" label="Link do Twitter" defaultValue={values.twitterUrl} />
              <Input name="youtubeUrl" label="Link do Youtube" defaultValue={values.youtubeUrl} />
              <Input name="instagramUrl" label="Link do Instagram" defaultValue={values.instagramUrl} />
              <Input name="pinterestUrl" label="Link do Pinterest" defaultValue={values.pinterestUrl} />
              <Input name="linkedinUrl" label="Link do Linkedin" defaultValue={values.linkedinUrl} />
              <Input name="tiktokUrl" label="Link do TikTok" defaultValue={values.tiktokUrl} />
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-20 flex justify-end border-t border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "✓ Salvar Alterações"}
        </button>
      </div>

      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Dados salvos!"
          errorTitle="Não foi possível salvar"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </form>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <header className="border-b border-slate-200 bg-slate-100 px-5 py-4">
      <h2 className="font-black text-slate-800">{title}</h2>
    </header>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <span className="text-sm font-bold text-slate-600">{label}</span>;
}

function Input({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <FieldLabel label={label} />
      <input
        {...props}
        className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500 read-only:bg-slate-100 read-only:text-slate-600 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function maskDocument(value: string, personType: string) {
  const digits = value.replace(/\D/g, "");

  if (personType === "JURIDICA") {
    return digits
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function buildPhysicalAddress(values: Partial<AddressValues>) {
  const streetLine = [values.street, values.number]
    .filter(Boolean)
    .join(", ");
  const complement = values.complement ? ` - ${values.complement}` : "";
  const districtLine = values.neighborhood ? ` - ${values.neighborhood}` : "";
  const cityLine = [values.city, values.state].filter(Boolean).join(" - ");
  const zipCode = values.zipCode ? ` - CEP ${values.zipCode}` : "";

  return [streetLine ? `${streetLine}${complement}${districtLine}` : "", cityLine, zipCode.replace(/^ - /, "")]
    .filter(Boolean)
    .join(" - ");
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

