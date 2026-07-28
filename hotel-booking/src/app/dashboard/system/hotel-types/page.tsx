"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import {
  OpsSectionHeader,
  OpsTable,
  OpsTd,
  OpsTh,
} from "@/components/admin/shared/primitives";
import { Button } from "@/components/ui/button";

interface Row {
  id: number;
  name: string;
  slug: string;
  count: number;
}

const DATASETS: Record<
  string,
  {
    title: string;
    description: string;
    rows: Row[];
  }
> = {
  cities: {
    title: "Cities",
    description: "Destinations available on the platform.",
    rows: [
      { id: 1, name: "Dhaka", slug: "dhaka", count: 42 },
      { id: 2, name: "Cox's Bazar", slug: "coxs-bazar", count: 28 },
      { id: 3, name: "Chattogram", slug: "chattogram", count: 19 },
      { id: 4, name: "Sylhet", slug: "sylhet", count: 12 },
      { id: 5, name: "Sajek Valley", slug: "sajek-valley", count: 6 },
    ],
  },

  "hotel-types": {
    title: "Hotel Types",
    description: "Classification used across search and filters.",
    rows: [
      { id: 1, name: "Hotel", slug: "hotel", count: 84 },
      { id: 2, name: "Resort", slug: "resort", count: 22 },
      { id: 3, name: "Boutique", slug: "boutique", count: 15 },
      { id: 4, name: "Hostel", slug: "hostel", count: 9 },
    ],
  },

  amenities: {
    title: "Amenities",
    description: "Master list synced to hotel forms.",
    rows: [
      { id: 1, name: "Free Wi-Fi", slug: "wifi", count: 130 },
      { id: 2, name: "Swimming Pool", slug: "pool", count: 46 },
      { id: 3, name: "Restaurant", slug: "restaurant", count: 88 },
      { id: 4, name: "Parking", slug: "parking", count: 102 },
      { id: 5, name: "Spa & Wellness", slug: "spa", count: 24 },
      { id: 6, name: "Airport Shuttle", slug: "shuttle", count: 31 },
    ],
  },

  "bed-types": {
    title: "Bed Types",
    description: "Bed inventory options exposed to Hotel Admins.",
    rows: [
      { id: 1, name: "Single", slug: "single", count: 120 },
      { id: 2, name: "Double", slug: "double", count: 210 },
      { id: 3, name: "Queen", slug: "queen", count: 88 },
      { id: 4, name: "King", slug: "king", count: 66 },
      { id: 5, name: "Bunk", slug: "bunk", count: 14 },
    ],
  },
};

export default function HotelTypesPage() {
  // Change this value to show another dataset
  const data = DATASETS["hotel-types"];

  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return data.rows.filter((row) =>
      row.name.toLowerCase().includes(q.toLowerCase())
    );
  }, [q]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title={data.title}
        description={data.description}
        right={
          <Button size="sm" className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New {data.title.replace(/s$/, "")}
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${data.title.toLowerCase()}...`}
          className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-7 pr-2 text-xs outline-none focus:border-primary/60"
        />
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Name</OpsTh>
            
            <OpsTh className="w-32 text-right">Usage</OpsTh>
            <OpsTh className="w-24" />
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-secondary/40">
              <OpsTd className="text-[13px]">{row.name}</OpsTd>

              

              <OpsTd className="text-right font-mono text-xs tabular-nums">
                {row.count}
              </OpsTd>

              <OpsTd className="text-right">
                <button className="text-xs text-primary hover:underline">
                  Edit
                </button>
              </OpsTd>
            </tr>
          ))}
        </tbody>
      </OpsTable>
    </div>
  );
}
