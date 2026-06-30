"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Fuel, Users, Settings2 } from "lucide-react";

const cars = [
  { id: 1, name: "Toyota Premio", type: "Sedan", price: 4500, rating: 4.7, seats: 5, fuel: "Octane", transmission: "Auto", location: "Dhaka", image: "https://images.unsplash.com/photo-1657872737697-737a2d123ef2?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=1200" },
  { id: 2, name: "Toyota Noah", type: "Microbus", price: 6000, rating: 4.8, seats: 11, fuel: "Diesel", transmission: "Auto", location: "Dhaka", image: "https://images.unsplash.com/photo-1581862142388-23e1c52ca091?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=600" },
  { id: 3, name: "Toyota Allion", type: "Sedan", price: 4000, rating: 4.6, seats: 5, fuel: "Octane", transmission: "Auto", location: "Chattogram", image: "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=600" },
  { id: 4, name: "Toyota Hiace", type: "Microbus", price: 7500, rating: 4.7, seats: 15, fuel: "Diesel", transmission: "Manual", location: "Cox's Bazar", image: "https://images.unsplash.com/photo-1650807486050-a142ea418b19?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=600" },
  { id: 5, name: "Mitsubishi Pajero", type: "SUV", price: 9000, rating: 4.9, seats: 7, fuel: "Diesel", transmission: "Auto", location: "Sylhet", image: "https://images.unsplash.com/photo-1594978100646-ccd2ae32b711?q=80&w=1351&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=600" },
  { id: 6, name: "Toyota Axio", type: "Sedan", price: 3500, rating: 4.5, seats: 5, fuel: "Octane", transmission: "Auto", location: "Dhaka", image: "https://images.unsplash.com/photo-1744804166135-ee25510e4a51?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=600" },
];

const CarRental = () => {
  const [filter, setFilter] = useState("All");
  const types = ["All", "Electric", "Sedan", "SUV", "Sports"];
  const filtered = filter === "All" ? cars : cars.filter(c => c.type === filter);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-28 pb-20 ">
        <div className="container mx-auto px-4 max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Rent Your <span className="text-gradient">Dream Car</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Premium vehicles at unbeatable prices. Drive in style wherever you go.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-10 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  filter === t
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "glass text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Cars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((car, i) => (
              <Card
                key={car.id}
                className="overflow-hidden hover-lift group animate-fade-in-up"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={car.image}
                    alt={car.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 glass px-3 py-1 rounded-full text-xs font-medium">
                    {car.type}
                  </div>
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">{car.name}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="text-sm font-medium">{car.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {car.seats}</span>
                    <span className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5" /> {car.fuel}</span>
                    <span className="flex items-center gap-1"><Settings2 className="h-3.5 w-3.5" /> {car.transmission}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-gradient">${car.price}</span>
                      <span className="text-sm text-muted-foreground">/day</span>
                    </div>
                    <Button variant="default" size="sm">Rent Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

    </div>
  );
};

export default CarRental;