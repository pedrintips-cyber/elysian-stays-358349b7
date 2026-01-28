import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export type SearchFiltersValue = {
  city: string | null;
  priceMin: number | null;
  priceMax: number | null;
};

const CITIES = [
  "Salvador",
  "Recife",
  "Olinda",
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Fortaleza",
  "Vitória",
  "Florianópolis",
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SearchFiltersValue;
  onApply: (value: SearchFiltersValue) => void;
  onClear: () => void;
};

export function SearchFiltersDialog({ open, onOpenChange, value, onApply, onClear }: Props) {
  const [draft, setDraft] = React.useState<SearchFiltersValue>(value);

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const priceRange: [number, number] = [
    draft.priceMin ?? 100,
    draft.priceMax ?? 500,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select
              value={draft.city ?? "__all__"}
              onValueChange={(v) => setDraft((p) => ({ ...p, city: v === "__all__" ? null : v }))}
            >
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <Label>Preço por diária</Label>
              <span className="text-[12px] text-muted-foreground tabular-nums">
                R$ {priceRange[0]} – R$ {priceRange[1]}
              </span>
            </div>
            <Slider
              value={priceRange}
              onValueChange={(v) => {
                const [a, b] = v as unknown as [number, number];
                const min = Math.min(a, b);
                const max = Math.max(a, b);
                setDraft((p) => ({ ...p, priceMin: min, priceMax: max }));
              }}
              min={100}
              max={500}
              step={10}
            />
          </div>
        </div>

        <DialogFooter className="mt-2 flex-row gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
          >
            Limpar
          </Button>
          <Button
            type="button"
            className="rounded-2xl"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
