
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChefHat, Utensils, Plus, ScrollText, CookingPot } from "lucide-react"

export function RecipesModule() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Reseptiikka</h2>
        <p className="text-muted-foreground">Luo ja hallitse keittiön reseptejä sekä annoskortteja.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Reseptit -osio */}
        <Card className="bg-card border-border shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <ChefHat className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Uusi Resepti</CardTitle>
            <CardDescription className="text-sm">
              Luo yksittäinen komponentti, raaka-aine tai valmistusohje.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full copper-gradient text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Aloita resepti
            </Button>
            
            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                <ScrollText className="w-3.5 h-3.5" /> Viimeisimmät reseptit
              </div>
              <div className="space-y-2 opacity-50 italic text-xs text-center py-4 border border-dashed border-border rounded-lg">
                Ei vielä luotuja reseptejä.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Annokset -osio */}
        <Card className="bg-card border-border shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer">
          <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-50" />
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <CookingPot className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Uusi Annos</CardTitle>
            <CardDescription className="text-sm">
              Kokoa useista resepteistä kokonainen annos tai menu-kokonaisuus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full steel-detail text-background font-bold gap-2">
              <Plus className="w-4 h-4" /> Kokoa annos
            </Button>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                <Utensils className="w-3.5 h-3.5" /> Viimeisimmät annokset
              </div>
              <div className="space-y-2 opacity-50 italic text-xs text-center py-4 border border-dashed border-border rounded-lg">
                Ei vielä luotuja annoksia.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tilastoja tai ohjeita */}
      <Card className="bg-muted/30 border-border border-dashed">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent/10 border border-accent/20">
              <ScrollText className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="font-bold">Automatisoitu arkistointi</h4>
              <p className="text-xs text-muted-foreground">Kaikki tallentamasi reseptit löytyvät automaattisesti myös Arkisto-osiosta.</p>
            </div>
          </div>
          <Button variant="outline" className="text-xs border-accent/30 text-accent hover:bg-accent/10">
            Lue käyttöohje
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
