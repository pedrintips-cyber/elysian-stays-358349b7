import * as React from "react";
import { Search, SlidersHorizontal, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AmbientGlow } from "./AmbientGlow";
import { BottomNavAir } from "./BottomNavAir";
import { Listing, ListingCardAir } from "./ListingCardAir";

import listing01 from "@/assets/listing-01.jpg";
import listing02 from "@/assets/listing-02.jpg";
import listing03 from "@/assets/listing-03.jpg";
import listing04 from "@/assets/listing-04.jpg";

const listings: Listing[] = [
  {
    id: "l1",
    title: "Apartamento solar — Centro",
    subtitle: "2 hóspedes · 1 quarto · Wi‑Fi rápido",
    rating: 4.92,
    price: "R$ 389 / noite",
    imageSrc: listing01,
  },
  {
    id: "l2",
    title: "Refúgio na praia — vista mar",
    subtitle: "Pôr do sol · varanda · café incluso",
    rating: 4.88,
    price: "R$ 620 / noite",
    imageSrc: listing02,
  },
  {
    id: "l3",
    title: "Cabana moderna entre pinheiros",
    subtitle: "Lareira · trilhas · silêncio",
    rating: 4.95,
    price: "R$ 540 / noite",
    imageSrc: listing03,
  },
  {
    id: "l4",
    title: "Loft urbano — janelas gigantes",
    subtitle: "Arte · plantas · metrô próximo",
    rating: 4.86,
    price: "R$ 455 / noite",
    imageSrc: listing04,
  },
];

export default function AirbnbInspiredMobile() {
  const [query, setQuery] = React.useState("Rio de Janeiro · 2 hóspedes");

  return (
    <div className="min-h-dvh bg-background">
      <div className="relative mx-auto min-h-dvh max-w-md overflow-hidden">
        <AmbientGlow />

        <header
          className={cn(
            "sticky top-0 z-40",
            "glass border-b",
          )}
        >
          <div className="px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-muted-foreground">Explore</span>
                <span className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">stay</span>
              </div>

              <Button variant="ghostSoft" size="icon" aria-label="Abrir perfil" className="shadow-elev">
                <UserCircle2 className="h-6 w-6" strokeWidth={1.6} />
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1">
                <label className="sr-only" htmlFor="search">
                  Buscar
                </label>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-full border bg-surface px-4 py-3 shadow-elev",
                  )}
                >
                  <Search className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
                  <input
                    id="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={cn(
                      "w-full bg-transparent text-[14px] font-medium text-foreground",
                      "placeholder:text-muted-foreground focus:outline-none",
                    )}
                    placeholder="Para onde?"
                  />
                </div>
              </div>

              <Button
                variant="pill"
                size="icon"
                aria-label="Filtros"
                className="h-12 w-12"
              >
                <SlidersHorizontal className="h-5 w-5" strokeWidth={1.7} />
              </Button>
            </div>
          </div>
        </header>

        <main className="relative px-4 pb-28 pt-4">
          <h1 className="sr-only">Interface mobile premium inspirada no Airbnb</h1>

          <section aria-label="Anúncios" className="space-y-5">
            {listings.map((l, idx) => (
              <div key={l.id} className={cn("animate-fade-up", idx === 0 && "")}
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <ListingCardAir listing={l} />
              </div>
            ))}
          </section>
        </main>

        <BottomNavAir />
      </div>
    </div>
  );
}
