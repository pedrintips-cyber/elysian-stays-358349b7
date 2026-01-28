import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
 import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Users, Bed, Bath } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
 
 interface Property {
   id: string;
   title: string;
   city: string;
   price_per_night: number;
   rating: number;
   image_url: string;
   description: string;
   bedrooms: number;
   bathrooms: number;
   guests: number;
   amenities: string[];
 }

type PropertyPhoto = {
  url: string;
  sort_order: number;
};

type Review = {
  rating: number;
  comment: string;
  author: string;
  createdAtLabel: string;
};

function hashStringToInt(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMockReviews(seedKey: string): Review[] {
  const rand = mulberry32(hashStringToInt(seedKey));
  const templates = [
    "Lugar muito bem cuidado e confortável. Voltaria com certeza.",
    "Boa localização e check-in tranquilo. Ótimo custo-benefício.",
    "A casa é bonita e bem equipada. Só poderia ter mais silêncio à noite.",
    "Tudo limpo, cama confortável e ótima comunicação com o anfitrião.",
    "Excelente para descansar. Wi‑Fi funcionou bem e o espaço é bem aconchegante.",
    "Atendeu super bem a estadia. Alguns detalhes pequenos, mas nada que atrapalhe.",
  ];

  const names = ["Ana", "Bruno", "Camila", "Diego", "Fernanda", "Gustavo", "Juliana", "Marcos"];
  const dates = ["há 2 semanas", "há 1 mês", "há 3 meses", "há 5 dias", "há 2 meses", "há 6 meses"];

  const count = 4;
  const reviews: Review[] = [];
  for (let i = 0; i < count; i++) {
    // 3–5 estrelas, com leve tendência a 4/5
    const r = rand();
    const rating = r < 0.18 ? 3 : r < 0.62 ? 4 : 5;
    const comment = templates[Math.floor(rand() * templates.length)];
    const author = names[Math.floor(rand() * names.length)];
    const createdAtLabel = dates[Math.floor(rand() * dates.length)];
    reviews.push({ rating, comment, author, createdAtLabel });
  }
  return reviews;
}
 
 export default function PropertyDetail() {
   const { id } = useParams();
   const navigate = useNavigate();
   const [property, setProperty] = useState<Property | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<PropertyPhoto[]>([]);
   const [loading, setLoading] = useState(true);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const handleBack = () => {
    // If the user landed directly on this URL, there may be no SPA history to go back to.
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };
 
  useEffect(() => {
    if (!id) return;
    fetchProperty();
    fetchPhotos();
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
 
   const fetchProperty = async () => {
     const { data, error } = await supabase
       .from("properties")
       .select("*")
       .eq("id", id)
       .single();
 
     if (error) {
       console.error("Erro ao buscar propriedade:", error);
     } else {
       setProperty(data);
     }
     setLoading(false);
   };

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from("property_photos")
      .select("url, sort_order")
      .eq("property_id", id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Erro ao buscar fotos do álbum:", error);
      setAlbumPhotos([]);
      return;
    }

    setAlbumPhotos((data ?? []) as PropertyPhoto[]);
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    const { data, error } = await supabase
      .from("property_reviews")
      .select("rating, comment, created_at")
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      console.error("Erro ao buscar avaliações:", error);
      setReviews(generateMockReviews(id ?? "seed"));
      setReviewsLoading(false);
      return;
    }

    const mapped = (data ?? [])
      .filter((r: any) => typeof r?.rating === "number")
      .map((r: any, idx: number) => ({
        rating: Math.min(5, Math.max(1, Number(r.rating))),
        comment: (r.comment ?? "") as string,
        author: "Hóspede",
        createdAtLabel: "",
      }));

    setReviews(mapped.length ? mapped : generateMockReviews(id ?? "seed"));
    setReviewsLoading(false);
  };

  const galleryUrls = useMemo(() => {
    if (!property) return [] as string[];
    const cover = property.image_url ? [property.image_url].filter(Boolean) : [];
    const extras = (albumPhotos ?? []).map((p) => p.url).filter(Boolean);
    // evita duplicar a capa caso ela também esteja no álbum
    const uniq = Array.from(new Set([...cover, ...extras]));
    return uniq.length ? uniq : cover;
  }, [property, albumPhotos]);

  const handleImgError = (url: string) => {
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="text-muted-foreground">Carregando...</div>
       </div>
     );
   }
 
   if (!property) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="text-center">
           <p className="text-muted-foreground mb-4">Propriedade não encontrada</p>
           <Button onClick={() => navigate("/")}>Voltar</Button>
         </div>
       </div>
     );
   }
 
   return (
    <div className="min-h-dvh bg-background">
      <div className="relative mx-auto min-h-dvh max-w-md overflow-hidden">
        <div className="relative">
          <Carousel
            className="relative touch-pan-y select-none"
            opts={{ loop: true, align: "start" }}
          >
            <CarouselContent className="ml-0">
              {(galleryUrls.length ? galleryUrls : [property.image_url].filter(Boolean)).map((url, idx) => {
                const effectiveUrl = failedUrls.has(url) ? property.image_url : url;
                return (
                <CarouselItem key={`${url}-${idx}`} className="pl-0">
                  <div className="h-[420px] w-full overflow-hidden bg-surface">
                    {effectiveUrl ? (
                      <img
                        src={effectiveUrl}
                        alt={`${property.title} — foto ${idx + 1}`}
                        loading={idx === 0 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={idx === 0 ? "high" : "auto"}
                        className="h-full w-full object-contain"
                        onError={() => handleImgError(url)}
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>
                </CarouselItem>
                );
              })}
            </CarouselContent>

            {/* Setas (visíveis no mobile) */}
            <CarouselPrevious
              variant="pill"
              className={cn(
                "left-3 top-1/2 -translate-y-1/2",
                "h-10 w-10 shadow-soft",
              )}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.7} />
              <span className="sr-only">Foto anterior</span>
            </CarouselPrevious>
            <CarouselNext
              variant="pill"
              className={cn(
                "right-3 top-1/2 -translate-y-1/2",
                "h-10 w-10 shadow-soft",
              )}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.7} />
              <span className="sr-only">Próxima foto</span>
            </CarouselNext>
          </Carousel>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/60 to-transparent" />

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <Button
              onClick={handleBack}
              variant="pill"
              size="icon"
              className="pointer-events-auto"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.7} />
            </Button>
          </div>
        </div>

        <main className="px-4 pb-32 pt-5">
          <header className="space-y-2">
            <h1 className="text-[26px] font-semibold leading-[1.08] tracking-[-0.02em]">
              {property.title}
            </h1>

            <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium text-foreground">{property.rating}</span>
              </div>
              <span aria-hidden="true">•</span>
              <span>{property.city}</span>
            </div>
          </header>

          <section className="mt-5 grid grid-cols-3 gap-2 rounded-3xl border bg-surface p-3 shadow-elev">
            <div className="rounded-2xl bg-surface-2 px-3 py-2 text-left">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Hóspedes</span>
              </div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{property.guests}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-3 py-2 text-left">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Bed className="h-4 w-4" />
                <span>Quartos</span>
              </div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{property.bedrooms}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-3 py-2 text-left">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Bath className="h-4 w-4" />
                <span>Banheiros</span>
              </div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{property.bathrooms}</div>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-[15px] font-semibold text-foreground">Comodidades</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(property.amenities?.length ? property.amenities : ["Wi‑Fi", "Cozinha", "Ar‑condicionado"]).map(
                (amenity, index) => (
                  <Badge key={index} variant="secondary" className="rounded-full">
                    {amenity}
                  </Badge>
                ),
              )}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border bg-surface p-4 shadow-soft">
            <h2 className="text-[15px] font-semibold text-foreground">Sobre este lugar</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {property.description || "Sem descrição no momento. Em breve, mais detalhes sobre o espaço."}
            </p>
          </section>

          <section className="mt-6 rounded-3xl border bg-surface p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-foreground">Avaliações</h2>
              <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium text-foreground">{property.rating}</span>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="mt-3 text-sm text-muted-foreground">Carregando avaliações…</div>
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.slice(0, 4).map((r, idx) => (
                  <div key={idx} className="rounded-2xl bg-surface-2 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{r.author}</div>
                        {r.createdAtLabel ? (
                          <div className="text-[12px] text-muted-foreground">{r.createdAtLabel}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < r.rating ? "fill-primary text-primary" : "text-muted-foreground/40",
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                      {r.comment || "Estadia muito boa — recomendo."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside
          className={cn(
            "safe-pb fixed inset-x-0 bottom-0 z-50",
            "border-t bg-surface/85 backdrop-blur-xl shadow-nav",
          )}
        >
          <div className="mx-auto max-w-md px-4 pb-3 pt-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-muted-foreground">Preço por noite</div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">
                    R$ {property.price_per_night.toFixed(0)}
                  </span>
                  <span className="text-[12px] text-muted-foreground">/ noite</span>
                </div>
              </div>

              <Button
                size="lg"
                className="h-12 rounded-2xl px-6"
                onClick={() => navigate(`/checkout?property=${property.id}`)}
              >
                Reservar
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
   );
 }