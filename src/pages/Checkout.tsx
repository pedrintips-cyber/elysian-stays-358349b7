import { useEffect, useMemo, useState } from "react";
 import { useNavigate, useSearchParams } from "react-router-dom";
 import { supabase } from "@/lib/supabase";
 import { useToast } from "@/hooks/use-toast";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Slider } from "@/components/ui/slider";
 import { ArrowLeft, Calendar as CalendarIcon, DollarSign, Loader2 } from "lucide-react";
  import { PixPaymentDialog } from "@/components/payments/PixPaymentDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
 
 interface Property {
   id: string;
   title: string;
   city: string;
   price_per_night: number;
   image_url: string;
 }

function createUuidV4() {
  // Alguns navegadores (principalmente Android mais antigo) não suportam crypto.randomUUID().
  // Garantimos um fallback para evitar "tela branca" por exception.
  try {
    const c: any = typeof crypto !== "undefined" ? crypto : null;
    if (c?.randomUUID) return c.randomUUID() as string;

    if (c?.getRandomValues) {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      // RFC4122 v4
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    // ignore
  }

  // Último fallback (não-criptográfico, mas evita crash)
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-4${s4().slice(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${s4().slice(1)}-${s4()}${s4()}${s4()}`;
}
 
 export default function Checkout() {
   const [searchParams] = useSearchParams();
   const navigate = useNavigate();
   const { toast } = useToast();
 
   const propertyId = searchParams.get("property");
 
   const [property, setProperty] = useState<Property | null>(null);
   const [nights, setNights] = useState(1);
    const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
   const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
   const [guestPhone, setGuestPhone] = useState("");
    const [guestCpf, setGuestCpf] = useState("");
   const [loading, setLoading] = useState(true);
   const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

    const [pixOpen, setPixOpen] = useState(false);
    const [pixQrCode, setPixQrCode] = useState<string | null>(null);
    const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);

  // Limite máximo permitido pelo adquirente para PIX (não exibimos o número na UI).
  const PIX_MAX_TOTAL = 1000;

    const maxNights = useMemo(() => {
      // Enquanto o preço não estiver carregado, não permita selecionar várias diárias
      // para evitar que o usuário consiga “passar do máximo” antes do cálculo.
      if (!property?.price_per_night) return 1;

      const computed = Math.floor(PIX_MAX_TOTAL / Number(property.price_per_night));
      return Math.max(1, Math.min(30, computed || 1));
    }, [property?.price_per_night]);

    useEffect(() => {
      // garante que o slider não fique acima do permitido
      setNights((prev) => Math.min(prev, maxNights));
    }, [maxNights]);
 
   useEffect(() => {
     if (!propertyId) {
       toast({
         variant: "destructive",
         title: "Propriedade não informada",
       });
       navigate("/");
       return;
     }
 
     fetchProperty();
  }, [propertyId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);
 
   const fetchProperty = async () => {
     const { data, error } = await supabase
       .from("properties")
       .select("id, title, city, price_per_night, image_url")
       .eq("id", propertyId)
       .maybeSingle();
 
     if (error || !data) {
       toast({
         variant: "destructive",
         title: "Erro ao carregar propriedade",
       });
       navigate("/");
     } else {
       setProperty(data);
     }
     setLoading(false);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     if (!property) return;

      if (!checkInDate) {
        toast({
          variant: "destructive",
          title: "Escolha a data de check-in",
          description: "Selecione o dia de entrada para continuar.",
        });
        return;
      }

      // basic client-side validation (server validates again)
      const cpfDigits = guestCpf.replace(/\D+/g, "");
      if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim() || cpfDigits.length !== 11) {
        toast({
          variant: "destructive",
          title: "Preencha seus dados",
          description: "Nome, e-mail, telefone e CPF (11 dígitos) são obrigatórios para gerar o PIX.",
        });
        return;
      }
 
      setSubmitting(true);

      // Blindagem extra: se, por algum motivo (race condition/estado antigo),
      // o usuário estiver acima do máximo, ajustamos automaticamente.
      const effectiveNights = Math.min(nights, maxNights);
      if (effectiveNights !== nights) setNights(effectiveNights);

      const totalPrice = property.price_per_night * effectiveNights;

      // 1) Create booking first (pending payment)
      // IMPORTANT: avoid `.select().single()` on insert because it requires SELECT permission under RLS.
      // We generate the id client-side so we can proceed to payment without needing a returning row.
      const bookingId = createUuidV4();
      const { error: bookingErr } = await supabase
        .from("bookings")
        .insert(
          [
            {
              id: bookingId,
              user_id: userId,
              property_id: property.id,
               check_in_date: format(checkInDate, "yyyy-MM-dd"),
              nights: effectiveNights,
              price_per_night: property.price_per_night,
              total_price: totalPrice,
              guest_name: guestName.trim(),
              guest_email: guestEmail.trim(),
              guest_phone: guestPhone.trim(),
            },
          ],
          ({ returning: "minimal" } as any),
        );

      if (bookingErr) {
        setSubmitting(false);
        console.error("Erro ao criar reserva:", bookingErr);
        toast({
          variant: "destructive",
          title: "Erro ao criar reserva",
          description: bookingErr?.message ?? "Tente novamente.",
        });
        return;
      }

      // 2) Create PIX transaction via backend
      const amountCents = Math.max(1, Math.round(Number(totalPrice) * 100));
      const items = [{
        title: `${property.title} (${nights} noite(s))`,
        quantity: 1,
        unitPrice: amountCents,
      }];

      setPixQrCode(null);
      setPixCopyPaste(null);
      setPixOpen(true);

      const { data: payData, error: payErr } = await supabase.functions.invoke("hurapayments-create", {
        body: {
          bookingId,
          amountCents,
          guest: {
            name: guestName,
            email: guestEmail,
            phone: guestPhone,
            cpf: cpfDigits,
          },
          items,
          metadata: {
            booking_id: bookingId,
            property_id: property.id,
          },
        },
      });

      setSubmitting(false);

      if (payErr || !payData?.ok) {
        console.error("Erro ao criar transação PIX:", payErr, payData);
        const message =
          (payData as any)?.userMessage ??
          (payData as any)?.error ??
          "A reserva foi criada, mas não conseguimos gerar o PIX agora. Tente novamente.";
        toast({
          variant: "destructive",
          title: "Erro ao gerar PIX",
          description: message,
        });
        setPixOpen(false);
        return;
      }

      setPixQrCode(payData?.pix?.qrCode ?? null);
      setPixCopyPaste(payData?.pix?.copyPaste ?? null);

      toast({
        title: "PIX gerado!",
        description: "Faça o pagamento para confirmar automaticamente sua reserva.",
      });

      return;
   };
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   if (!property) return null;
 
   const total = property.price_per_night * nights;
 
   return (
     <div className="min-h-dvh bg-background">
       <div className="relative mx-auto min-h-dvh max-w-md">
         <header className="sticky top-0 z-40 glass border-b">
           <div className="px-4 py-4 flex items-center gap-3">
             <Button
               type="button"
               variant="pill"
               size="icon"
               onClick={() => navigate(-1)}
               aria-label="Voltar"
             >
               <ArrowLeft className="h-5 w-5" strokeWidth={1.7} />
             </Button>
             <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
               Finalizar reserva
             </h1>
           </div>
         </header>
 
         <main className="px-4 pb-8 pt-6 space-y-6">
            <PixPaymentDialog
              open={pixOpen}
              onOpenChange={setPixOpen}
              title={property.title}
              qrCode={pixQrCode}
              copyPaste={pixCopyPaste}
              amountLabel={`R$ ${total.toFixed(2)}`}
            />

           <Card className="overflow-hidden shadow-soft">
             <div className="flex gap-4 p-4">
               <img
                 src={property.image_url}
                 alt={property.title}
                 className="h-20 w-20 rounded-2xl object-cover"
               />
               <div className="min-w-0 flex-1">
                 <h2 className="text-[15px] font-semibold text-foreground truncate">
                   {property.title}
                 </h2>
                 <p className="mt-1 text-[13px] text-muted-foreground">{property.city}</p>
                 <p className="mt-2 text-[14px] font-semibold text-foreground">
                   R$ {property.price_per_night.toFixed(0)} / noite
                 </p>
               </div>
             </div>
           </Card>
 
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[16px]">
                  <CalendarIcon className="h-5 w-5" />
                  Data de check-in
                </CardTitle>
                <CardDescription>Escolha o dia de entrada</CardDescription>
              </CardHeader>
              <CardContent>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full justify-between rounded-2xl"
                      disabled={submitting}
                    >
                      <span>
                        {checkInDate ? format(checkInDate, "dd/MM/yyyy") : "Selecionar data"}
                      </span>
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkInDate}
                      onSelect={setCheckInDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        return d < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-[16px]">
                  <CalendarIcon className="h-5 w-5" />
                 Quantas diárias?
               </CardTitle>
               <CardDescription>Escolha a duração da sua estadia</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-[15px] font-semibold text-foreground">
                   {nights} {nights === 1 ? "dia" : "dias"}
                 </span>
                 <span className="text-[13px] text-muted-foreground">
                    1 a {maxNights} dias
                 </span>
               </div>
               <Slider
                 value={[nights]}
                 onValueChange={(v) => setNights(v[0])}
                 min={1}
                  max={maxNights}
                 step={1}
                 className="w-full"
               />
             </CardContent>
           </Card>
 
           <Card className="shadow-soft">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-[16px]">
                 <DollarSign className="h-5 w-5" />
                 Resumo da reserva
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
                <div className="flex justify-between text-[14px]">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium text-foreground">
                    {checkInDate ? format(checkInDate, "dd/MM/yyyy") : "—"}
                  </span>
                </div>
               <div className="flex justify-between text-[14px]">
                 <span className="text-muted-foreground">
                   R$ {property.price_per_night.toFixed(0)} × {nights} {nights === 1 ? "noite" : "noites"}
                 </span>
                 <span className="font-medium text-foreground">
                   R$ {total.toFixed(2)}
                 </span>
               </div>
               <div className="border-t pt-3 flex justify-between text-[16px] font-semibold">
                 <span className="text-foreground">Total</span>
                 <span className="text-foreground">R$ {total.toFixed(2)}</span>
               </div>
             </CardContent>
           </Card>
 
           <form onSubmit={handleSubmit} className="space-y-4">
             <Card className="shadow-soft">
               <CardHeader>
                 <CardTitle className="text-[16px]">Dados do hóspede</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="guestName">Nome completo</Label>
                   <Input
                     id="guestName"
                     type="text"
                     placeholder="Seu nome"
                     value={guestName}
                     onChange={(e) => setGuestName(e.target.value)}
                     required
                     disabled={submitting}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="guestEmail">E-mail</Label>
                   <Input
                     id="guestEmail"
                     type="email"
                     placeholder="seu@email.com"
                     value={guestEmail}
                     onChange={(e) => setGuestEmail(e.target.value)}
                     required
                     disabled={submitting}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="guestPhone">Telefone</Label>
                   <Input
                     id="guestPhone"
                     type="tel"
                     placeholder="(00) 00000-0000"
                     value={guestPhone}
                     onChange={(e) => setGuestPhone(e.target.value)}
                     required
                     disabled={submitting}
                   />
                 </div>

                  <div className="space-y-2">
                    <Label htmlFor="guestCpf">CPF</Label>
                    <Input
                      id="guestCpf"
                      type="text"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={guestCpf}
                      onChange={(e) => setGuestCpf(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
               </CardContent>
             </Card>
 
             <Button
               type="submit"
               size="lg"
               className="w-full h-12 rounded-2xl"
                disabled={submitting || !checkInDate}
             >
               {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Confirmar reserva — R$ {total.toFixed(2)}
             </Button>
           </form>
         </main>
       </div>
     </div>
   );
 }